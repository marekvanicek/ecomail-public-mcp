# Changelog

All notable changes to the Lettr MCP project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-10-21

### Fixed

- `get-automation-stats-emails` failed with HTTP 405. It now calls `GET /pipelines/{id}/stats-detail` with `emails[]` in the query string.
- Array query parameters are sent as `key[]=a&key[]=b`, the format the Ecomail API expects.
- `per_page` on `get-automation-stats-emails` and `get-automation-stats-detail` is capped at 100, the API maximum.

## [1.0.0] - 2026-02-20

### Added

- Initial release of Lettr MCP Server
- Send transactional emails with HTML, plain text, templates, and attachments
- Template management: list, create, get, update, delete
- Template merge tags: discover variables required for template-based sending
- Domain management: list, create, get, delete, verify
- Webhook management: list, get
- Support for template-based sending with substitution data
- Configurable default sender and reply-to addresses
