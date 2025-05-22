# Tweakcord Style Guide

### Naming Conventions

- Use kebab-case for tweak names
- Tweak names should be descriptive of the tweak's functionality
- Keep tweak names concise but informative
- No working tweak shall be removed or renamed. If a tweak broke, fix it.
- If needed, add a deprecation notice from `-deprecation-notice.scss`

### File Header

If the style is non-trivial, add attribution.
If there were any moderate changes, add a revision number.
If there are any warnings, such as a dependency or SCSS syntax, add a comment prefixed with `!`

### Tweak compatability

Use `// $if <eval>` to modify CSS based on selected tweaks. Will check if @tweaks are present in the compile.
If false and inline, will remove the single line the comment is on.
If false and the comment is on its own line, will remove the next block.
See collapse-members-list and seamless-chat-bar for examples.

### SCSS Guidelines

- Use prettier
- Unless neccesary, use vanilla CSS. Note that nesting _is_ vanilla CSS.
- Use Discord's class names for targeting elements: the class names are automatically updated
- Use Discord's variables for better compatability
- Minimize the use of complex selectors
- Minimize the use of !important
- Consider the impact on rendering performance
- Use comments to explain complex logic or important sections
- Prefix custom properties with `--tweakcord-` to avoid collision
- Include references to original sources when applicable
- All tweaks should try to be compatible with each other
