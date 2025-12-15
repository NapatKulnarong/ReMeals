# Security Policy

## Supported Versions

We actively support and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < Latest | :x:                |

## Reporting a Vulnerability

We take the security of ReMeals seriously. If you discover a security vulnerability, please follow these steps:

### 1. **Do NOT** create a public issue

Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.

### 2. Contact the Security Team

Send an email to the project maintainers with the subject line: **"Security Vulnerability Report - ReMeals"**

**Contact Information:**
- Karnpon Poochitkanon - karnpon14513@gmail.com
- Napat Kulnarong - kul.napat@hotmail.com
- Nisara Ploysuttipol - nisara.ploys@gmail.com
- Tanon Likhittaphong - 2005tanon@gmail.com

### 3. Include Details

Please include the following information in your report:

- **Type of vulnerability** (e.g., SQL injection, XSS, authentication bypass)
- **Affected component** (backend, frontend, API, database)
- **Steps to reproduce** the vulnerability
- **Potential impact** of the vulnerability
- **Suggested fix** (if you have one)
- **Your contact information** (optional, for follow-up questions)

### 4. Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution**: Depends on severity and complexity

### 5. Disclosure Policy

- We will acknowledge receipt of your report within 48 hours
- We will keep you informed of the progress toward fixing the vulnerability
- We will notify you when the vulnerability has been fixed
- We will credit you in the security advisories (unless you prefer to remain anonymous)

## Security Best Practices

### For Users

- **Keep dependencies updated**: Regularly update your dependencies to receive security patches
- **Use strong passwords**: Use strong, unique passwords for all accounts
- **Environment variables**: Never commit `.env` files or expose sensitive credentials
- **HTTPS**: Always use HTTPS in production
- **Regular backups**: Maintain regular backups of your database

### For Developers

- **Input validation**: Always validate and sanitize user input
- **SQL injection**: Use Django ORM instead of raw SQL queries
- **XSS protection**: Use React's built-in XSS protection and sanitize user-generated content
- **Authentication**: Use secure authentication methods (header-based auth with `X-USER-ID`)
- **Secrets management**: Never hardcode secrets, API keys, or passwords
- **Dependencies**: Regularly update dependencies and review security advisories
- **Code review**: All code changes should be reviewed before merging

### Security Checklist

Before deploying to production:

- [ ] All environment variables are properly configured
- [ ] `DEBUG=False` in production
- [ ] `SECRET_KEY` is strong and kept secure
- [ ] Database credentials are secure
- [ ] CORS is properly configured
- [ ] HTTPS is enabled
- [ ] Dependencies are up to date
- [ ] No sensitive data in logs
- [ ] Error messages don't expose sensitive information
- [ ] Rate limiting is configured (if applicable)

## Known Security Considerations

### Current Security Features

- **Password Hashing**: Uses bcrypt for password hashing
- **Header-based Authentication**: Custom authentication via `X-USER-ID` header
- **CORS Configuration**: Configured for frontend access
- **Input Validation**: Django forms and serializers validate input
- **SQL Injection Protection**: Django ORM prevents SQL injection
- **XSS Protection**: React provides built-in XSS protection

### Areas for Improvement

- Token-based authentication (future enhancement)
- Rate limiting implementation
- API key management
- Session management
- Audit logging

## Security Updates

Security updates will be communicated through:

- Release notes
- Security advisories (if critical)
- Email notifications to maintainers

## Acknowledgments

We appreciate the security research community's efforts to help keep ReMeals secure. Security researchers who responsibly disclose vulnerabilities will be credited (with permission) in our security advisories.

## Resources

- [Django Security](https://docs.djangoproject.com/en/5.2/topics/security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [React Security](https://react.dev/learn/escape-hatches)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)

---

**Thank you for helping keep ReMeals secure!** 🔒

