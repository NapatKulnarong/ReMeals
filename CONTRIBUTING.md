# Contributing to ReMeals

Thank you for your interest in contributing to ReMeals! 🍽️♻️

This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Re-Meals.git
   cd Re-Meals
   ```
3. **Set up the development environment** following the [Setup Guide](./docs/SETUP.md)
4. **Create a branch** for your contribution:
   ```bash
   git checkout -b feat/your-feature-name
   ```

## How to Contribute

We welcome contributions in many forms:

- 🐛 **Bug Reports**: Report bugs by describing the issue, steps to reproduce, and expected behavior
- ✨ **New Features**: Propose new features that align with the project's goals
- 📝 **Documentation**: Improve documentation, fix typos, or add examples
- 🧪 **Tests**: Add or improve test coverage
- 🎨 **UI/UX**: Enhance the user interface and user experience
- 🔧 **Refactoring**: Improve code quality and maintainability

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feat/your-feature-name
```

**Branch Naming Convention:**
- `feat/feature-name` - New features
- `fix/bug-name` - Bug fixes
- `docs/doc-name` - Documentation
- `refactor/refactor-name` - Code refactoring
- `test/test-name` - Adding tests
- `chore/maintenance-name` - Maintenance tasks

### 2. Make Your Changes

- Follow the code style guidelines (see [Code Style](#code-style))
- Write clear, self-documenting code
- Add comments for complex logic
- Update documentation as needed

### 3. Test Your Changes

**Backend:**
```bash
cd backend
source venv/bin/activate  # macOS/Linux
# OR
.\venv\Scripts\Activate.ps1  # Windows
python manage.py test
```

**Frontend:**
```bash
cd frontend
npm test  # When implemented
npm run lint
```

See the [Testing Guide](./docs/TEST.md) for more details.

### 4. Commit Your Changes

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
git add .
git commit -m "feat: add user authentication feature"
```

**Commit Types:**
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks
- `style:` - Code style changes (formatting)
- `perf:` - Performance improvements

### 5. Push and Create Pull Request

```bash
git push origin feat/your-feature-name
```

Then create a pull request on GitHub.

## Code Style

### Python (Backend)

- Follow [PEP 8](https://pep8.org/) style guide
- Line length: 100 characters
- Use type hints for function parameters and return types
- Use Google-style docstrings
- Run `flake8` and `black` before committing

### TypeScript/React (Frontend)

- Use 2 spaces for indentation
- Follow ESLint rules
- Use functional components with hooks
- Use explicit types, avoid `any`
- Run `npm run lint` before committing

For detailed guidelines, see the [Development Guide](./docs/DEVELOPMENT.md).

## Testing

- Write tests for new features
- Ensure all tests pass before submitting
- Aim for good test coverage
- Include both unit and integration tests

See the [Testing Guide](./docs/TEST.md) for comprehensive testing guidelines.

## Documentation

- Update relevant documentation when adding features
- Add docstrings to new functions and classes
- Update API documentation if endpoints change
- Keep examples up to date

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] No console.log or debug prints
- [ ] Environment variables properly configured
- [ ] Migrations created and tested (if applicable)
- [ ] No sensitive data committed
- [ ] Commit messages follow convention

### PR Description Template

When creating a pull request, include:

1. **Description**: What changes does this PR introduce?
2. **Type**: Feature, Bug Fix, Documentation, etc.
3. **Testing**: How was this tested?
4. **Screenshots**: If UI changes (if applicable)
5. **Related Issues**: Link to any related issues

### Review Process

1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, your PR will be merged
4. Thank you for your contribution! 🎉

## Questions?

- Check the [Development Guide](./docs/DEVELOPMENT.md) for detailed guidelines
- Review the [Setup Guide](./docs/SETUP.md) for environment setup
- Contact the project maintainers:
  - Karnpon Poochitkanon - karnpon14513@gmail.com
  - Napat Kulnarong - kul.napat@hotmail.com
  - Nisara Ploysuttipol - nisara.ploys@gmail.com
  - Tanon Likhittaphong - 2005tanon@gmail.com

## Recognition

Contributors will be recognized in the project's acknowledgments. Thank you for helping make ReMeals better! 🙏

---

**ReMeals: Making a difference, one meal at a time.** 🍽️♻️

