# Documentation Maintenance Guide

This guide outlines the procedures for maintaining, updating, and ensuring the quality of the WeHub.work PMS documentation.

## Overview

Good documentation requires ongoing maintenance to remain accurate, useful, and up-to-date. This guide provides the processes and standards for keeping our documentation in excellent condition.

## Maintenance Responsibilities

### Documentation Owners

- **Architecture Team**: Maintains architecture/ and backend/ documentation
- **Frontend Team**: Maintains frontend/ and component documentation
- **DevOps Team**: Maintains deployment/ and operations documentation
- **Integration Team**: Maintains integrations/ documentation
- **Product Team**: Maintains features/ and getting-started/ documentation

### All Contributors

All team members are responsible for:
- Updating documentation when making code changes
- Reporting documentation issues or gaps
- Reviewing documentation changes in pull requests
- Following documentation standards and templates

## Update Procedures

### When to Update Documentation

Documentation should be updated:

1. **Code Changes**: When implementing new features or modifying existing functionality
2. **Bug Fixes**: When fixing bugs that affect documented behavior
3. **Configuration Changes**: When modifying environment variables, deployment configs, or system settings
4. **API Changes**: When adding, modifying, or deprecating API endpoints
5. **Integration Changes**: When updating third-party integrations or external system connections
6. **Process Changes**: When team workflows or procedures change

### How to Update Documentation

#### Step 1: Identify Affected Documentation

Before making changes, identify which documentation files need updates:

```bash
# Search for references to the component/feature you're changing
cd docs/
grep -r "YourFeatureName" .
```

#### Step 2: Make Documentation Changes

1. Update the relevant documentation files
2. Follow the appropriate template (see `docs/templates/`)
3. Ensure consistency with existing documentation style
4. Update any cross-references or related documents

#### Step 3: Validate Changes

Before committing:

```bash
# Run link validation
node docs/scripts/validate-links.js

# Check for broken references
node docs/scripts/check-references.js

# Validate markdown formatting
npm run lint:docs
```

#### Step 4: Submit for Review

1. Include documentation changes in the same PR as code changes
2. Tag appropriate documentation owners for review
3. Ensure CI/CD documentation checks pass

### Documentation Update Checklist

When updating documentation, verify:

- [ ] Content is accurate and reflects current implementation
- [ ] All code examples are tested and working
- [ ] Internal links are valid and point to correct locations
- [ ] Cross-references are updated
- [ ] Related documents are updated if needed
- [ ] Formatting follows documentation standards
- [ ] Spelling and grammar are correct
- [ ] Images and diagrams are up-to-date
- [ ] Version information is current
- [ ] Last updated date is set

## Version Control Guidelines

### Commit Messages

Use clear, descriptive commit messages for documentation changes:

```
docs: update booking engine API documentation

- Add new endpoint for availability search
- Update authentication requirements
- Fix broken links to integration guide
```

### Branch Naming

For documentation-only changes:
```
docs/feature-name
docs/fix-broken-links
docs/update-api-endpoints
```

### Pull Request Guidelines

Documentation PRs should:

1. **Have a clear title**: "docs: [brief description]"
2. **Include context**: Explain why the documentation is being updated
3. **Reference related issues**: Link to related code PRs or issues
4. **Request appropriate reviewers**: Tag documentation owners
5. **Pass all checks**: Ensure automated validation passes

### Review Process

#### For Code PRs with Documentation

- Documentation changes are reviewed alongside code changes
- Reviewers verify documentation accurately reflects code changes
- Documentation must be approved before merging

#### For Documentation-Only PRs

- Require at least one approval from documentation owner
- Technical accuracy review by subject matter expert
- Style and formatting review
- Link validation must pass

## Quality Assurance

### Automated Checks

Our CI/CD pipeline runs automated documentation checks:

1. **Link Validation**: Ensures all internal links are valid
2. **Markdown Linting**: Checks formatting consistency
3. **Spell Checking**: Catches common spelling errors
4. **Reference Validation**: Verifies cross-references exist

### Manual Review Checklist

Reviewers should verify:

- [ ] **Accuracy**: Content is technically correct
- [ ] **Completeness**: All necessary information is included
- [ ] **Clarity**: Content is easy to understand
- [ ] **Consistency**: Follows documentation standards
- [ ] **Navigation**: Links and cross-references work
- [ ] **Examples**: Code examples are correct and tested
- [ ] **Formatting**: Proper markdown formatting
- [ ] **Audience**: Appropriate for target audience

### Quarterly Documentation Audit

Every quarter, conduct a documentation audit:

1. **Review all documentation sections**
2. **Identify outdated content**
3. **Check for broken links**
4. **Verify code examples still work**
5. **Update version information**
6. **Consolidate duplicate content**
7. **Archive obsolete documentation**

## Documentation Standards

### File Naming Conventions

- Use lowercase with hyphens: `feature-name.md`
- Be descriptive but concise: `booking-engine-integration.md`
- Use consistent naming across similar documents

### Markdown Formatting

#### Headers

```markdown
# Page Title (H1 - only one per document)

## Major Section (H2)

### Subsection (H3)

#### Detail Section (H4)
```

#### Code Blocks

Always specify the language:

```markdown
```javascript
const example = "code";
```
```

#### Links

Use relative links for internal documentation:

```markdown
[Link text](../other-section/document.md)
```

Use absolute URLs for external links:

```markdown
[External resource](https://example.com)
```

#### Lists

Use consistent list formatting:

```markdown
- Unordered list item
- Another item
  - Nested item

1. Ordered list item
2. Another item
   1. Nested item
```

### Content Structure

Every documentation page should include:

1. **Title**: Clear, descriptive H1 heading
2. **Overview**: Brief introduction to the topic
3. **Main Content**: Organized with clear sections
4. **Examples**: Practical examples where applicable
5. **Related Links**: Links to related documentation
6. **Last Updated**: Date of last significant update

### Writing Style

- **Be concise**: Get to the point quickly
- **Be clear**: Use simple, direct language
- **Be consistent**: Use the same terms throughout
- **Be helpful**: Anticipate reader questions
- **Be accurate**: Ensure technical correctness
- **Use active voice**: "The system processes requests" not "Requests are processed"
- **Use present tense**: "The API returns" not "The API will return"

## Templates

Use the appropriate template for new documentation:

- **Feature Documentation**: `docs/templates/feature-documentation-template.md`
- **API Endpoints**: `docs/templates/api-endpoint-template.md`
- **Integration Guides**: `docs/templates/integration-guide-template.md`
- **Troubleshooting**: `docs/templates/troubleshooting-template.md`

## Tools and Scripts

### Available Scripts

```bash
# Validate all documentation links
npm run docs:validate-links

# Check for broken references
npm run docs:check-references

# Lint markdown files
npm run docs:lint

# Generate documentation site (if applicable)
npm run docs:build

# Serve documentation locally
npm run docs:serve
```

### Link Validation

Run link validation before committing:

```bash
node docs/scripts/validate-links.js
```

This checks:
- Internal links point to existing files
- Anchors reference existing headers
- No broken external links (with caching)

### Reference Checking

Verify cross-references are valid:

```bash
node docs/scripts/check-references.js
```

This ensures:
- Referenced documents exist
- Cross-references are bidirectional where appropriate
- Related documents are properly linked

## Common Maintenance Tasks

### Adding a New Document

1. Choose the appropriate directory
2. Use the relevant template
3. Follow naming conventions
4. Add to section README.md
5. Update main docs/README.md if needed
6. Add cross-references from related docs

### Deprecating Documentation

When documentation becomes obsolete:

1. Add deprecation notice at the top
2. Link to replacement documentation
3. Move to `docs/archive/` after 6 months
4. Update all references to point to new location
5. Add redirect mapping

### Reorganizing Documentation

When restructuring documentation:

1. Create proposal document
2. Get team approval
3. Update redirect mappings
4. Move files systematically
5. Update all internal links
6. Validate all changes
7. Communicate changes to team

### Handling External References

For documentation referenced externally:

1. Maintain redirect mappings in `docs/redirect-mappings.json`
2. Keep old URLs working when possible
3. Add redirects in web server configuration
4. Document URL changes in CHANGELOG

## Troubleshooting

### Broken Links

If you encounter broken links:

1. Run link validation: `npm run docs:validate-links`
2. Fix broken links in source documents
3. Update redirect mappings if needed
4. Verify fixes with validation script

### Outdated Content

If you find outdated documentation:

1. Create an issue documenting what's outdated
2. Tag the appropriate documentation owner
3. Update the content or create a PR
4. Add "Last Updated" date

### Missing Documentation

If you identify documentation gaps:

1. Create an issue describing the gap
2. Use the appropriate template to create new documentation
3. Link from related documents
4. Update section README

## Contact and Support

### Documentation Questions

- **General questions**: Ask in #documentation Slack channel
- **Technical accuracy**: Contact subject matter experts
- **Process questions**: Contact documentation maintainers

### Reporting Issues

Report documentation issues:
- Create GitHub issue with "docs:" prefix
- Use "documentation" label
- Provide specific details about the issue

---

**Last Updated**: [Date will be set during migration]

**Maintained By**: Documentation Team

**Review Schedule**: Quarterly
