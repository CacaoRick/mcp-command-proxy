# Contributing to MCP Command Proxy

Thank you for your interest in contributing to MCP Command Proxy! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and considerate of others when contributing to this project.

## How Can I Contribute?

### Reporting Bugs

When reporting bugs, please include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Screenshots if applicable
- Your environment details (OS, Node.js version, etc.)

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

- A clear and descriptive title
- A detailed description of the proposed enhancement
- Any relevant examples or mock-ups

### Pull Requests

1. Fork the repository
2. Create a new branch for your feature or bug fix
3. Write your code, with tests if applicable
4. Ensure all tests pass
5. Submit a pull request with a clear description of the changes

Please make sure your code follows our style guidelines:

- Use TypeScript
- Format code with Prettier
- Follow ESLint rules
- Write meaningful commit messages

## Development Setup

```bash
# Clone your fork of the repo
git clone https://github.com/YOUR_USERNAME/mcp-command-proxy.git

# Navigate to the project directory
cd mcp-command-proxy

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test
```

## Project Structure

- `src/` - Source code
  - `index.ts` - Main entry point for library
  - `cli.ts` - CLI entry point
  - `utils/` - Utility functions
    - `command-runner.ts` - Core command running functionality
    - `buffer.ts` - Circular buffer implementation
- `dist/` - Compiled JavaScript code

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE). 