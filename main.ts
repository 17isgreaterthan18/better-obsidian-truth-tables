import { App, Editor, MarkdownView, Modal, Plugin, PluginSettingTab, Setting, Notice } from 'obsidian';
import * as ohm from 'ohm-js'; 

interface BetterTruthTablesSettings {
	defaultValueFormat: string;
}

const DEFAULT_SETTINGS: Partial<BetterTruthTablesSettings> = {
	defaultValueFormat: 'T/F',
}

const GRAMMAR = ohm.grammar(String.raw`
boolean {

term = operation | group | variable | literal
operation = binary | complement
complement = "!" (group | variable | literal)
binary = term operator term
operator = or | and
and = "." | "&" | "&&" | "*"
or = "+" | "|" | "||"
group = "(" term ")"

literal = "0" -- false
| "1" -- true

variable = character+
character = latex_symbol | letter
latex_symbol = "\\" | "_" | "^" | "{" | "}"
}
`);

const INPUT_MAP : Map<string,boolean> = new Map<string,boolean>();
const OUTPUT_MAP : Map<string,ohm.MatchResult> = new Map<string,ohm.MatchResult>();
const SEMANTICS : ohm.Semantics = GRAMMAR.createSemantics();
SEMANTICS.addOperation('eval', {
	literal_false(_) {return false},
	literal_true(_) {return true},
	variable(a) {return INPUT_MAP.get(a.sourceString)},
	group(_, a, __) {return a.eval()},
	complement(_, a) {return !a.eval()},
	binary(a, b, c) {
		if (b.child(0).ctorName == 'and') {
			return a.eval() && c.eval();
		} else {
			return a.eval() || c.eval();
		}
	}
})

export default class BetterTruthTables extends Plugin {
	settings: BetterTruthTablesSettings;

	async onload() {
		await this.loadSettings();

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'insert-truth-table',
			name: 'Insert truth table',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				new InsertTruthTableModal(this.app, editor, this).open();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class InsertTruthTableModal extends Modal {
	inputs: string[];
	outputs: string[];
	inlineMath: any;
	valueFormat: string[];
	editor: Editor;
	plugin: BetterTruthTables;
	constructor(app: App, editor : Editor, plugin : BetterTruthTables) {
		super(app);
		this.editor = editor;
		this.plugin = plugin;
	}
	
	onOpen() {
		const {contentEl} = this;
		this.setTitle("Insert Truth Table");

		this.valueFormat = this.plugin.settings.defaultValueFormat.split('/').reverse();
		new Setting(contentEl) // value format
		.setName('Value format')
		.setDesc('Style of values')
		.addDropdown((dropdown) => {
			dropdown.addOptions({
				'1/0': '1/0',
				'T/F': 'T/F',
				'true/false': 'true/false',
				'True/False': 'True/False',
				'Y/N': 'Y/N',
				'yes/no': 'yes/no',
				'Yes/No': 'Yes/No',
			});
			dropdown.setValue(this.plugin.settings.defaultValueFormat);
			console.log(this.plugin.settings.defaultValueFormat);
			dropdown.onChange((val) => this.valueFormat = val.split('/').reverse());
		});

		// this.inlineMath = true;
		// new Setting(contentEl) // toggle inline math
		// .setName('As math')
		// .setDesc('If enabled, use inline math for column headings')
		// .addToggle((toggle) => {
		// 	toggle.setValue(true);
		// 	toggle.onChange(val => this.inlineMath = val);
		// });

		new Setting(contentEl) // inputs
		.setName('Inputs')
		.setDesc('Comma seperated list of input variables')
		.addText((text) => {
			text.setPlaceholder('e.g.: p, q, r');
			text.onChange(val => this.inputs = val.replace(/s+/, '').split(','));
		});

		new Setting(contentEl) // outputs
		.setName('Outputs')
		.setDesc('Comma seperated list of output expressions')
		.addTextArea((ta) => {
			ta.setPlaceholder('e.g.: !p+q, !(p.q), switchOne || a & !b');
			ta.onChange(val => {this.outputs = val.replace(/s+/, '').split(',');});
		});

		new Setting(contentEl) // submit button
		.addButton(button => {
			button.setButtonText("Insert");
			button.onClick( () => this.handleSubmission())
		})

		// contentEl.addEventListener('keyup', (ev) => {
		// 	if (ev.key == 'Enter') {
		// 		this.handleSubmission()
		// 	}
		// });
	}
	
	handleSubmission() {
		let success : boolean = true;
		OUTPUT_MAP.clear();
		// console.log(this.outputs);

		if (this.outputs != undefined) {
			this.outputs.forEach((val) => { // check that outputs are valid
				const match = GRAMMAR.match(val);
				if (match.failed()) {
					success = false;
				} else {
					OUTPUT_MAP.set(val, match);
				}
			});
		}
		if (!success) {
			new Notice("Syntax error in outputs!")
			return;
		}
		if (this.inputs == undefined || this.inputs.length < 1) {
			new Notice("Must have at least one input!");
			return;
		}
		this.createTruthTable();
	}
	
	createTruthTable() {
		const numRows : number = Math.pow(2, this.inputs.length); // 2^n arrangements
		
		INPUT_MAP.clear(); // setup inputs map
		this.inputs.forEach((val) => INPUT_MAP.set(val, false))

		let table : string; // setup table and table header
		
		table = `| ${this.inputs.join(' | ')} |`; // add inputs to header, then add outputs if available ( \/ )
		table += `${ (this.outputs == undefined || this.outputs.length < 1) ? '' : ` ${this.outputs.join(' | ')} |`}\n`;
		
		table += `|${' - |'.repeat(this.inputs.length + (this.outputs?.length ?? 0))}\n`; // start body
		
		for (let row = 1; row <= numRows; row++) {
			table += '|';

			// add inputs for this row
			this.inputs.forEach((val, index) => {
				// change input value if needed
				if (row != 1 && (row-1) % (Math.pow(2, this.inputs.length - index - 1)) == 0) {
					INPUT_MAP.set(val, !INPUT_MAP.get(val));
				}
				const n : number = INPUT_MAP.get(val) ? 1 : 0; // value representation
				table += ` ${this.valueFormat[n]} |`;
			});

			// add outputs for this row - if outputs in use
			if (this.outputs != undefined && this.outputs.length > 0) {
				this.outputs.forEach((val) => {
					// evaluate expression with inputs
					const v : boolean = SEMANTICS(OUTPUT_MAP?.get(val) ?? GRAMMAR.match('0')).eval();
					const n : number = v ? 1 : 0; // value representation
					table += ` ${this.valueFormat[n]} |`;
				});
			}
			
			table += '\n'; // end row
		}
		this.editor.replaceSelection(table); // insert table
		this.close(); // close modal
	}
	
	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}


class SampleSettingTab extends PluginSettingTab {
	plugin: BetterTruthTables;

	constructor(app: App, plugin: BetterTruthTables) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Default Value Format')
			.setDesc('Default format for boolean values')
			.addDropdown( (dropdown) => {
				dropdown.addOptions({
					'1/0': '1/0',
					'T/F': 'T/F',
					'true/false': 'true/false',
					'True/False': 'True/False',
					'Y/N': 'Y/N',
					'yes/no': 'yes/no',
					'Yes/No': 'Yes/No',
				});
				dropdown.setValue(this.plugin.settings.defaultValueFormat);
				dropdown.onChange(async (val) => {
					this.plugin.settings.defaultValueFormat = val;
					await this.plugin.saveSettings();
				});
			});
		}
	}
