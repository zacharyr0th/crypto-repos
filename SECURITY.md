# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability within Crypto Repos, please send an email to [zacharyroth@pm.me]. All security vulnerabilities will be promptly addressed.

Please do not report security vulnerabilities through public GitHub issues.

### Code Contributions

✅ No secrets or credentials in code
✅ Use parameterized queries
✅ Validate all inputs
✅ Handle errors securely
✅ Follow least privilege principle
✅ Add security tests where relevant

### Environment Setup

✅ Use .env.local for secrets
✅ Never commit .env files
✅ Use strong, unique credentials
✅ Keep development environment updated

### API Development

✅ Implement rate limiting
✅ Add input validation
✅ Use CORS protection
✅ Handle errors properly
✅ Document security requirements

## Incident Response

### Severity Levels

1. **Critical** - Data breach, RCE, auth bypass

   - Response: < 24 hours
   - Immediate patch required
   - User notification required

2. **High** - SQL injection, XSS, CSRF

   - Response: < 48 hours
   - Patch in next release
   - Security advisory issued

3. **Medium** - Rate limit bypass, information disclosure

   - Response: < 1 week
   - Fix in regular release cycle

4. **Low** - Minor configuration issues, non-critical vulnerabilities
   - Response: < 2 weeks
   - Fix in maintenance updates

### Response Process

1. Immediate triage and severity assessment
2. Issue containment and mitigation
3. Root cause analysis
4. Patch development and testing
5. Deployment and verification
6. Post-mortem and documentation

## Contact Information

### Primary Contact

- Email: zacharyroth@pm.me
- X/Twitter: [@zacharyr0th](https://x.com/zacharyr0th)

### Response Times

- Critical/High severity: < 24 hours
- Medium severity: < 48 hours
- Low severity: < 1 week
