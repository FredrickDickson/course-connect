# n8n-MCP Integration for Windsurf

This project uses n8n-MCP to provide AI assistants with comprehensive access to n8n workflow automation nodes, documentation, and operations.

## Installation

### Option 1: Quick Start (Recommended - Free Tier)
1. Sign up at [dashboard.n8n-mcp.com](https://dashboard.n8n-mcp.com)
2. Get your API key
3. Update `.windsurf/mcp_config.json` with your API key:
   ```json
   {
     "mcpServers": {
       "n8n-mcp": {
         "command": "npx",
         "args": ["-y", "n8n-mcp"],
         "env": {
           "N8N_MCP_API_KEY": "your-api-key-here"
         }
       }
     }
   }
   ```

### Option 2: Self-Hosted
Run locally with npx:
```bash
npx -y n8n-mcp
```

Or with Docker:
```bash
docker run -p 3000:3000 czlonkowski/n8n-mcp
```

## Usage

The n8n-MCP provides access to:
- 1,505 n8n nodes (812 core + 693 community)
- Node properties with 99% coverage
- Node operations with 63.6% coverage
- Documentation from official n8n docs
- 2,709 workflow templates
- AI-capable tool variants

## Available MCP Tools

### Core Tools
- `tools_documentation` - Get documentation for any MCP tool
- `search_nodes` - Full-text search across all nodes
- `get_node` - Unified node information tool
- `validate_node` - Unified node validation
- `validate_workflow` - Complete workflow validation
- `search_templates` - Unified template search
- `get_template` - Get complete workflow JSON

### n8n Management Tools (requires API configuration)
- `n8n_create_workflow` - Create new workflows
- `n8n_get_workflow` - Retrieve workflows
- `n8n_update_partial_workflow` - Update workflow using diff operations
- `n8n_test_workflow` - Test workflow execution
- And more...

## Safety Warning

NEVER edit your production workflows directly with AI! Always:
- Make a copy of your workflow before using AI tools
- Test in development environment first
- Export backups of important workflows
- Validate changes before deploying to production

## Documentation

For complete documentation, see: [n8n-mcp GitHub](https://github.com/czlonkowski/n8n-mcp)
