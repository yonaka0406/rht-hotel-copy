# Contributing to Documentation

Thank you for contributing to the WeHub.work PMS documentation! This guide will help you make effective contributions.

## Quick Start

1. **Find what needs updating**: Check issues labeled "documentation" or identify gaps while working
2. **Choose the right template**: Use templates from `docs/templates/` for consistency
3. **Make your changes**: Follow our style guide and standards
4. **Validate**: Run `npm run docs:validate-links` before submitting
5. **Submit PR**: Create a pull request with clear description

## Documentation Structure

Our documentation is organized by audience and purpose:

```
docs/
├── getting-started/      # New user onboarding
├── architecture/         # System design and architecture
├── api/                  # API documentation
├── frontend/             # Frontend development
├── backend/              # Backend development
├── deployment/           # Operations and deployment
├── integrations/         # Third-party integrations
├── features/             # Feature-specific docs
├── development/          # Development guidelines
├── reference/            # Reference materials
└── templates/            # Documentation templates
```

## When to Update Documentation

Update documentation when you:

- Add a new feature or component
- Modify existing functionality
- Fix a bug that affects documented behavior
- Change APIs or interfaces
- Update configuration or deployment procedures
- Discover documentation gaps or errors

## How to Contribute

### 1. Identify the Right Location

Choose the appropriate directory based on content type:

- **New feature**: `docs/features/[feature-name]/`
- **API changes**: `docs/api/endpoints/`
- **Architecture**: `docs/architecture/`
- **Integration**: `docs/integrations/[system-name]/`
- **Deployment**: `docs/deployment/`
- **Getting started**: `docs/getting-started/`

### 2. Use the Right Template

Templates ensure consistency:

- **Feature documentation**: `docs/templates/feature-documentation-template.md`
- **API endpoint**: `docs/templates/api-endpoint-template.md`
- **Integration guide**: `docs/templates/integration-guide-template.md`
- **Troubleshooting**: `docs/templates/troubleshooting-template.md`

Copy the template and fill in the sections.

### 3. Follow Writing Guidelines

#### Style

- **Be clear and concise**: Get to the point quickly
- **Use active voice**: "The system processes" not "is processed by"
- **Use present tense**: "Returns" not "will return"
- **Be specific**: Use concrete examples
- **Be consistent**: Use the same terms throughout

#### Structure

Every document should have:

1. **Title**: Clear H1 heading
2. **Overview**: Brief introduction (2-3 sentences)
3. **Main content**: Organized with clear sections
4. **Examples**: Code examples where applicable
5. **Related links**: Links to related documentation

#### Code Examples

Always include working code examples:

```javascript
// Good: Complete, working example
const booking = await bookingService.create({
  clientId: 'client-123',
  roomId: 'room-456',
  checkIn: '2024-01-15',
  checkOut: '2024-01-20'
});
```

```javascript
// Avoid: Incomplete or unclear examples
const booking = await create(data);
```

#### Links

Use relative links for internal documentation:

```markdown
See [API Documentation](../api/README.md) for details.
```

Use descriptive link text:

```markdown
<!-- Good -->
See the [booking engine integration guide](../integrations/booking-engine/overview.md)

<!-- Avoid -->
Click [here](../integrations/booking-engine/overview.md)
```

### 4. Validate Your Changes

Before submitting, run validation:

```bash
# Validate all links
npm run docs:validate-links

# Check cross-references
npm run docs:check-references

# Run all checks
npm run docs:maintenance
```

Fix any issues reported by the validators.

### 5. Submit a Pull Request

#### PR Title Format

```
docs: brief description of changes

Examples:
docs: add booking engine API documentation
docs: update deployment guide for Docker
docs: fix broken links in architecture section
```

#### PR Description

Include:

- **What**: What documentation was changed
- **Why**: Why the change was needed
- **Related**: Link to related code PRs or issues
- **Testing**: How you validated the changes

Example:

```markdown
## What
Updated the booking engine API documentation to include new availability search endpoint.

## Why
New endpoint was added in PR #123 but documentation was not updated.

## Related
- Code PR: #123
- Issue: #124

## Testing
- Ran `npm run docs:validate-links` - all links valid
- Tested code examples - all working
- Reviewed by API team
```

#### Request Reviewers

Tag appropriate reviewers:

- **Architecture docs**: @architecture-team
- **API docs**: @backend-team
- **Frontend docs**: @frontend-team
- **Deployment docs**: @devops-team

## Documentation Standards

### File Naming

- Use lowercase with hyphens: `feature-name.md`
- Be descriptive: `booking-engine-integration.md`
- Avoid abbreviations: `authentication.md` not `auth.md`

### Markdown Formatting

#### Headers

```markdown
# Page Title (H1 - only one per page)

## Major Section (H2)

### Subsection (H3)

#### Detail (H4)
```

#### Code Blocks

Always specify language:

````markdown
```javascript
const example = "code";
```
````

#### Lists

```markdown
- Unordered list
- Another item
  - Nested item

1. Ordered list
2. Another item
```

#### Tables

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
```

#### Emphasis

```markdown
**Bold** for emphasis
*Italic* for terms
`code` for inline code
```

### Content Guidelines

#### Overview Section

Start with a brief overview:

```markdown
## Overview

This document describes the booking engine integration, which allows external
systems to search availability and create reservations through our API.
```

#### Examples

Include practical examples:

```markdown
## Example: Creating a Booking

```javascript
const booking = await api.bookings.create({
  clientId: 'client-123',
  roomId: 'room-456',
  checkIn: '2024-01-15',
  checkOut: '2024-01-20',
  guests: 2
});
```
```

#### Related Documentation

End with related links:

```markdown
## Related Documentation

- [API Authentication](../api/authentication.md)
- [Client Management](../features/client-management/overview.md)
- [Troubleshooting](../deployment/troubleshooting.md)
```

## Common Tasks

### Adding a New Feature Document

1. Create directory: `docs/features/[feature-name]/`
2. Copy template: `cp docs/templates/feature-documentation-template.md docs/features/[feature-name]/overview.md`
3. Fill in template sections
4. Add to features README: `docs/features/README.md`
5. Link from related documents

### Updating API Documentation

1. Update endpoint file: `docs/api/endpoints/[endpoint].md`
2. Update API README if needed: `docs/api/README.md`
3. Include request/response examples
4. Document error codes
5. Update integration guides if needed

### Fixing Broken Links

1. Run validator: `npm run docs:validate-links`
2. Fix reported broken links
3. Update redirect mappings if needed: `docs/redirect-mappings.json`
4. Re-run validator to confirm

### Deprecating Documentation

1. Add deprecation notice at top:

```markdown
> **⚠️ DEPRECATED**: This document is deprecated. See [New Document](../path/to/new.md) instead.
```

2. Update for 6 months, then move to archive
3. Update all references to point to new location

## Review Process

### Self-Review Checklist

Before requesting review:

- [ ] Content is accurate and complete
- [ ] Code examples are tested and working
- [ ] Links are valid (ran `npm run docs:validate-links`)
- [ ] Formatting follows standards
- [ ] Spelling and grammar are correct
- [ ] Related documents are updated
- [ ] Template structure is followed

### Reviewer Checklist

When reviewing documentation:

- [ ] Technical accuracy
- [ ] Completeness
- [ ] Clarity and readability
- [ ] Consistent terminology
- [ ] Working links and references
- [ ] Proper formatting
- [ ] Appropriate examples

## Getting Help

### Questions

- **General questions**: #documentation Slack channel
- **Technical accuracy**: Ask subject matter experts
- **Process questions**: Contact documentation maintainers

### Resources

- [Maintenance Guide](MAINTENANCE.md) - Ongoing maintenance procedures
- [Templates](templates/) - Documentation templates
- [Style Guide](documentation-standards.md) - Detailed style guidelines

## Recognition

We appreciate all documentation contributions! Contributors are recognized in:

- Git commit history
- Release notes for significant documentation improvements
- Team acknowledgments

Thank you for helping make our documentation better!

---

**Questions?** Open an issue with the "documentation" label or ask in #documentation
