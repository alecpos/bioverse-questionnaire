# Security Policy

## Supported Versions

We currently support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please send an email to [security@example.com](mailto:security@example.com). All security vulnerabilities will be promptly addressed.

Please include the following information in your report:

- Type of vulnerability
- Full path of the affected file(s)
- Steps to reproduce the issue
- Proof of concept or exploit code (if possible)
- Potential impact of the vulnerability

## Security Practices

This project follows these security best practices:

1. **Environment Variables**: Sensitive information like API keys and database credentials are stored in environment variables, not in the codebase.
2. **Input Validation**: All user inputs are validated and sanitized before processing.
3. **Authentication**: JWT-based authentication with proper token validation.
4. **Database Security**: Parameterized queries are used to prevent SQL injection.
5. **Dependency Management**: Regular updates via Dependabot to patch known vulnerabilities.

## Security Measures

- We use content security policies to mitigate XSS attacks
- API rate limiting is implemented to prevent abuse
- Passwords are hashed using bcrypt with appropriate salt rounds
- Regular security audits are performed on the codebase 