const assert=require('assert'),fs=require('fs'),vm=require('vm');
const src=fs.readFileSync(__dirname+'/app.js','utf8');
const nodes=new Map(), alerts=[];
function node(id){if(!nodes.has(id))nodes.set(id,{value:'',dataset:{},style:{},children:[],classList:{add(){},remove(){},toggle(){}},addEventListener(){},querySelectorAll(){return []},appendChild(c){this.children=[c]},innerHTML:'',textContent:''});return nodes.get(id);}
const storage=new Map();
const ctx=vm.createContext({console,Date,Math,Number,JSON,Array,Object,String,Set,Map,parseFloat,isFinite,window:{matchMedia:()=>({matches:true}),addEventListener(){},scrollTo(){}},document:{getElementById:node,querySelectorAll:()=>[],createElement:()=>({}),documentElement:{setAttribute(){},getAttribute(){return null}},addEventListener(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},navigator:{},setTimeout:()=>0,clearTimeout(){},alert:m=>alerts.push(m),confirm:()=>true,location:{},FileReader:class{readAsText(f){this.result=f;this.onload();}}});
vm.runInContext(src.slice(0,src.indexOf('// ---------- init ----------')),ctx);
vm.runInContext('cancelEdit=()=>{};',ctx);
const run=s=>vm.runInContext(s,ctx);

run(`state={type:'expense',txs:[],budget:0,currency:'ر.س',editingId:null,plan:null,accounts:[{id:'cash',name:'كاش',icon:'💵'}],challenges:[],lock:{enabled:false,pin:''}}`);
const recurring=run(`$('importFile').onchange({target:{files:[JSON.stringify({app:'masrofy',version:3,txs:[{id:1,type:'income',amount:100,category:'salary',date:'2026-08-07',nextDate:'2026-10-07',anchorDay:7,recur:'monthly',accountId:'cash'},{id:2,type:'income',amount:100,category:'salary',date:'2026-09-07',recur:'none',seriesId:1,accountId:'cash'}],accounts:state.accounts})],value:''}});state.txs.map(t=>t.date)`);
assert.deepStrictEqual([...recurring].sort(),['2026-08-07','2026-09-07']);

const account=run(`state.accounts=[{id:'cash',name:'cash'},{id:'bank',name:'bank'}];state.txs=[{id:10,type:'income',amount:100,accountId:'cash'}];window.accDel('cash');({id:state.txs[0].accountId,total:state.accounts.reduce((s,a)=>s+accBalance(a.id),0)})`);
assert.deepStrictEqual({...account},{id:'bank',total:100});

const transfer=run(`state.accounts=[{id:'cash',name:'cash'},{id:'bank',name:'bank'}];state.txs=[{id:20,type:'income',amount:100,accountId:'cash'},{id:21,type:'expense',amount:20,date:'2026-09-07',accountId:'cash',transfer:true,transferId:'tr-1'},{id:22,type:'income',amount:20,date:'2026-09-07',accountId:'bank',transfer:true,transferId:'tr-1'}];window.delTx(21);state.accounts.reduce((s,a)=>s+accBalance(a.id),0)`);
assert.equal(transfer,100);
run(`$('toast').children[0].onclick()`);
assert.equal(run(`state.txs.length`),3);

const escaped=run(`state.txs=[{id:30,type:'expense',amount:10,date:'2026-09-07',category:'food',note:'<img src=x onerror=alert(1)>',accountId:'cash'}];renderList();$('txList').innerHTML`);
assert(!escaped.includes('<img'));
assert(escaped.includes('&lt;img'));
assert.equal(run(`addInterval('2026-02-28','monthly',31)`),'2026-03-31');
assert(run(`fmt(10.49)`).includes('١٠٫٤٩'));
assert.equal(run(`localDate(new Date('2026-09-07T01:00:00+03:00'))`),'2026-09-07');

run(`downloadFile=(n,c)=>{window.backup=JSON.parse(c)};state.plan={salary:1000};exportJSON()`);
assert.equal(run(`window.backup.version`),3);
assert.equal(run(`window.backup.plan.salary`),1000);

run(`state.txs=[{id:40,type:'income',amount:50,date:'2026-09-07',category:'salary',accountId:'cash'}];const before=JSON.stringify(state.txs);$('importFile').onchange({target:{files:[JSON.stringify({app:'masrofy',txs:[],challenges:[{target:100,log:'bad'}]})],value:''}});window.importWasAtomic=JSON.stringify(state.txs)===before`);
assert.equal(run(`window.importWasAtomic`),true);

assert.equal(run(`cleanCategory('<img onerror=alert(1)>','expense')`),'other-exp');

run(`state.plan=null;state.txs=[{id:50,type:'income',amount:100,date:localDate(),category:'salary',accountId:'cash'},{id:51,type:'expense',amount:20,date:localDate(),category:'food',accountId:'cash'},{id:52,type:'income',amount:1000,date:'2026-08-07',category:'salary',accountId:'cash'}];state.budget=0;render()`);
assert.equal(run(`$('totalIncome').textContent`),run(`fmt(100)`));

run(`$('reportMonth').value=curMonth();state.budget=100;state.txs=[{id:60,type:'income',amount:100,date:localDate(),category:'salary',accountId:'cash'},{id:61,type:'expense',amount:150,date:localDate(),category:'food',accountId:'cash'}]`);
const report=run(`buildReportText()`);
assert(report.includes('150%'));
assert(report.includes('ادخار -50%'));
assert(src.includes('let run = opening'));

console.log('17 checks passed: prior data safety checks plus undo, category normalization, monthly dashboard, honest budget/deficit reporting, and opening balance.');
