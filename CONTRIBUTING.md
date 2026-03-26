# Contributing to ArclinkTune

Thank you for your interest in ArclinkTune! We welcome contributions that help make LLM fine-tuning more accessible and efficient.

## Important Note on Core Logic

While ArclinkTune utilizes [LlamaFactory](https://github.com/hiyouga/LlamaFactory) for its underlying training engine, we want to emphasize that the **Auto-tuning and AI-driven fine-tuning logic** is a completely original idea and implementation.

The following core components are unique to this project:
- **AI-Driven Hyperparameter Optimization**: The logic that uses AI (Gemini/Ollama) to "think," "evaluate," and "provide feedback" on training trials.
- **Auto-tuning Engine**: The asynchronous engine managing multiple training trials and AI-guided decision making.
- **Dynamic Report Generation**: The automated generation of HTML and JSON reports based on AI evaluation of training results.

Please respect this original work and focus your contributions on the surrounding features, UI improvements, or bug fixes.

## How to Contribute

1. **Fork the Repository**: Create your own copy of the project.
2. **Create a Branch**: `git checkout -b feature/your-feature-name`.
3. **Make Your Changes**: Ensure your code follows the existing style and conventions.
4. **Test Your Changes**: Run the available test scripts in the `scripts/` directory.
5. **Submit a Pull Request**: Provide a clear description of your changes and why they are needed.

## Development Setup

See the [README.md](README.md) for detailed instructions on setting up the backend and frontend development environments.

## License

By contributing to ArclinkTune, you agree that your contributions will be licensed under the PolyForm Noncommercial License 1.0.0, which governs this project.
