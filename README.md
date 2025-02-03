# Better Truth Tables (WIP)
An [Obsidian](https://obsidian.md/) plugin that automatically generates and populates [truth tables](https://en.wikipedia.org/wiki/Truth_table) of any number of variables and expressions. It evaluates the expressions for you!
## Features
- Automatically evaluates boolean expressions
- Fills input columns automatically
## Planned Features
- Toggle for inline math in column headings
	- Option to prettify expressions with LaTeX / choose representation
- Support additional boolean operations (xor, implication, etc.)
- Custom value representations (e.g. A/B, T/F)
## Usage
To insert a truth table, open the command palette (`ctrl+P`) and search for the command titled "Better Truth Tables: Insert Truth Table". A modal will open, presenting you with a couple options:

| Option           | Description                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Value Format** | Choose the display style of the boolean values in your table.                                                                                                                                                                                                                                                                                                                                                                  |
| **Inputs**       | A comma separated list of input variables. These variables and their values for each row will be displayed at the left of the table. Valid variable names are of any length, and may contain any uppercase or lowercase letter, as well as some symbols: `\{}_^`.                                                                                                                                                              |
| **Outputs**      | A comma separated list of output expressions. Inputs to these expressions can be variable names (they must be entered exactly as in the input list) or literals (`0` or `1`). Currently supported operations are:<br><br>complement/not - denoted by a prefixed exclamation mark `!`<br>or - denoted by `+` or `\|` or `\|\|`<br>and - denoted by `.` or `*` or `&` or `&&`<br><br>Operations can be grouped with parentheses. |

Once you're done, click `Insert` to insert your truth table!

## Remarks
Please report any bugs or make any feature requests by creating a Github issue.
Contributions are welcome!

Enjoy! :D