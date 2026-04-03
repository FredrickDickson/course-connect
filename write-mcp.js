import fs from 'fs';
const config = {
    mcpServers: {
        supabase: {
            serverUrl: "https://mcp.supabase.com/mcp?project_ref=emvibxbcrvritkwkguya"
        }
    }
};
fs.writeFileSync('C:\\Users\\Administrator\\.gemini\\antigravity\\mcp_config.json', JSON.stringify(config, null, 2));
console.log('MCP Config updated successfully');
