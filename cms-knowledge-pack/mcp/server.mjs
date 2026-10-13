// FILE: mcp/server.mjs
// Dependency-free, local-only MCP over stdio (JSON-RPC 2.0 newline-delimited).
// Node >=20. Does NOT sync Drive; it reads exported local markdown files.
// Important: MCP client must use this script's absolute executable path.
// No logging to stdout (stdout is protocol channel).
import {createInterface} from 'node:readline';
import {readFile, readdir} from 'node:fs/promises';
import {resolve, join, relative, sep} from 'node:path';
const ROOT=resolve(process.env.CMS_KNOWLEDGE_ROOT||process.cwd());
const rli=createInterface({input:process.stdin,crlfDelay:Infinity});
const tools=[
{name:'search_knowledge',description:'Full text search local exported Markdown content. Returns file name and snippets.',inputSchema:{type:'object',properties:{query:{type:'string'},limit:{type:'integer',minimum:1,maximum:20}},required:['query']}},
{name:'get_document',description:'Read one file from the local knowledge root by relative path.',inputSchema:{type:'object',properties:{path:{type:'string'}},required:['path']}},
{name:'get_decision',description:'Find a decision ID in local decision registry document.',inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id']}},
{name:'list_open_questions',description:'Return OPEN items from local decision registry.',inputSchema:{type:'object',properties:{},additionalProperties:false}}
];
const err=(code,message)=>({code,message});
function respond(id,result,error){process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,...(error?{error}:{result})})+'\n');}
function safePath(name){if(typeof name!=='string'||!name||name.includes('\0'))throw Error('Invalid path');const candidate=resolve(ROOT,name);const rel=relative(ROOT,candidate);if(rel==='..'||rel.startsWith('..'+sep)||candidate===ROOT)throw Error('Invalid relative file path');if(!/\.(md|txt|json)$/i.test(candidate))throw Error('Unsupported file extension');return candidate;}
async function walk(dir=ROOT,depth=0){if(depth>4)return [];let out=[];for(const entry of await readdir(dir,{withFileTypes:true})){if(entry.name.startsWith('.'))continue;const file=join(dir,entry.name);if(entry.isDirectory())out.push(...await walk(file,depth+1));else if(entry.isFile()&&/\.(md|txt)$/i.test(entry.name))out.push(file);}return out;}
async function decisionText(){try{return await readFile(safePath('decisions/decisions.md'),'utf8')}catch{return 'Decision registry missing: decisions/decisions.md';}}
async function action(name,args={}){
if(name==='get_document'){const f=safePath(args.path);const data=await readFile(f,'utf8');return data.slice(0,120000);}
if(name==='get_decision'){const str=await decisionText();const id=String(args.id||'').toUpperCase();if(!/^DEC-[A-Z0-9-]+$/.test(id))throw Error('Invalid Decision ID');const matches=str.split('\n').filter(line=>line.includes(id));return matches.length?matches.join('\n'):'Decision not found';}
if(name==='list_open_questions'){const str=await decisionText();return str.split('\n').filter(line=>line.includes('| OPEN |')||line.startsWith('OPEN/')).join('\n')||'No OPEN items';}
if(name==='search_knowledge'){const q=String(args.query||'').trim().toLocaleLowerCase('vi');if(q.length<2)throw Error('query must have 2+ characters');const limit=Math.max(1,Math.min(20,Number(args.limit)||8));const files=await walk();const results=[];for(const f of files){let s=await readFile(f,'utf8');const at=s.toLocaleLowerCase('vi').indexOf(q);if(at>=0)results.push({path:relative(ROOT,f),snippet:s.slice(Math.max(0,at-150),Math.min(s.length,at+400))});if(results.length>=limit)break;}return JSON.stringify(results);}
throw Error('Unknown tool: '+name);
}
rli.on('line',async line=>{let q;try{q=JSON.parse(line)}catch{return}const {id,method,params={}}=q;try{
if(method==='initialize'){respond(id,{protocolVersion:'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'cms-knowledge',version:'0.1.0'}});return;}
if(method==='notifications/initialized')return;
if(method==='ping'){respond(id,{});return;}
if(method==='tools/list'){respond(id,{tools});return;}
if(method==='tools/call'){const s=await action(params.name,params.arguments||{});respond(id,{content:[{type:'text',text:s}],isError:false});return;}
if(id!==undefined)respond(id,null,err(-32601,'Method not found'));
}catch(e){if(method==='tools/call')respond(id,{content:[{type:'text',text:String(e.message||e)}],isError:true});else if(id!==undefined)respond(id,null,err(-32603,String(e.message||e)));}});
