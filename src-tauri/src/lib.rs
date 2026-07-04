use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Category { pub id: i64, pub name: String, pub icon: String, pub parent_id: Option<i64>, pub is_default: bool, pub sort_order: i64, pub created_at: String }

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Expense { pub id: i64, pub amount: f64, pub category_id: i64, pub sub_category_id: Option<i64>, pub date: String, pub note: String, pub created_at: String, pub updated_at: String, pub category_name: Option<String>, pub category_icon: Option<String>, pub sub_category_name: Option<String> }

#[derive(Debug, Serialize, Deserialize)]
pub struct MonthlySummary { pub total: f64, pub by_category: Vec<CategorySummary> }

#[derive(Debug, Serialize, Deserialize)]
pub struct CategorySummary { #[serde(rename = "categoryId")] pub category_id: i64, #[serde(rename = "categoryName")] pub category_name: String, pub icon: String, pub total: f64, pub count: i64 }

#[derive(Debug, Serialize, Deserialize)]
pub struct MonthlyTrendItem { pub month: String, pub total: f64 }

#[derive(Debug, Deserialize)]
pub struct AddExpenseData { pub amount: f64, #[serde(rename = "categoryId")] pub category_id: i64, #[serde(rename = "subCategoryId")] pub sub_category_id: i64, pub date: String, pub note: Option<String> }

#[derive(Debug, Deserialize)]
pub struct UpdateExpenseData { pub amount: Option<f64>, #[serde(rename = "categoryId")] pub category_id: Option<i64>, #[serde(rename = "subCategoryId")] pub sub_category_id: Option<i64>, pub date: Option<String>, pub note: Option<String> }

#[derive(Debug, Deserialize)]
pub struct ExpenseFilters { #[serde(rename = "startDate")] pub start_date: Option<String>, #[serde(rename = "endDate")] pub end_date: Option<String>, #[serde(rename = "categoryId")] pub category_id: Option<i64>, pub keyword: Option<String> }

#[derive(Debug, Serialize, Deserialize)]
pub struct AppData { categories: Vec<Category>, expenses: Vec<Expense>, next_id: i64 }

const DEFAULT_CATEGORIES: &[(&str, &str, &[&str])] = &[
    ("餐饮饮食", "🍽️", &["早餐", "午餐", "晚餐", "零食水果", "饮品", "聚餐请客"]),
    ("交通出行", "🚗", &["公交地铁", "打车", "加油充电", "停车费", "火车飞机"]),
    ("购物消费", "🛒", &["服装鞋帽", "数码产品", "家居日用", "美妆护肤", "其他购物"]),
    ("住房居住", "🏠", &["房租", "水电燃气", "物业费", "维修保养", "家居用品"]),
    ("休闲娱乐", "🎮", &["电影演出", "游戏充值", "运动健身", "旅游度假", "KTV酒吧"]),
    ("医疗健康", "💊", &["门诊挂号", "药品购买", "住院治疗", "体检保健", "牙科眼科"]),
    ("教育学习", "📚", &["培训课程", "书籍资料", "考试报名", "文具用品", "网课会员"]),
    ("人情往来", "🎁", &["红包送礼", "婚丧嫁娶", "请客吃饭", "捐款慈善", "聚会分摊"]),
    ("金融服务", "💰", &["银行手续费", "贷款利息", "保险缴费", "投资亏损", "其他金融"]),
    ("其他支出", "📦", &["快递物流", "宠物用品", "美容美发", "彩票博彩", "其他杂项"]),
];

pub struct DbState(pub Mutex<AppData>);
pub struct DataPath(pub PathBuf);

fn now_str() -> String {
    let secs = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs();
    format!("{}d-{:02}:{:02}:{:02}", secs/86400, (secs%86400)/3600, (secs%3600)/60, secs%60)
}

fn init_app_data() -> AppData {
    let mut cats = Vec::new(); let mut id: i64 = 1;
    for (i, (name, icon, subs)) in DEFAULT_CATEGORIES.iter().enumerate() {
        let pid = id; id += 1;
        cats.push(Category { id: pid, name: name.to_string(), icon: icon.to_string(), parent_id: None, is_default: true, sort_order: i as i64, created_at: now_str() });
        for (j, sub) in subs.iter().enumerate() {
            cats.push(Category { id, name: sub.to_string(), icon: String::new(), parent_id: Some(pid), is_default: true, sort_order: j as i64, created_at: now_str() });
            id += 1;
        }
    }
    AppData { categories: cats, expenses: Vec::new(), next_id: id }
}

fn load_or_init(p: &PathBuf) -> AppData {
    fs::read_to_string(p).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_else(|| { let d = init_app_data(); save_data(p, &d); d })
}

fn save_data(p: &PathBuf, d: &AppData) { if let Ok(s) = serde_json::to_string_pretty(d) { fs::write(p, s).ok(); } }

#[tauri::command]
fn get_categories(state: State<DbState>) -> Result<Vec<Category>, String> {
    let d = state.0.lock().map_err(|e| e.to_string())?;
    let mut c: Vec<Category> = d.categories.iter().filter(|c| c.parent_id.is_none()).cloned().collect();
    c.sort_by_key(|c| c.sort_order); Ok(c)
}

#[tauri::command]
fn get_sub_categories(state: State<DbState>, parent_id: i64) -> Result<Vec<Category>, String> {
    let d = state.0.lock().map_err(|e| e.to_string())?;
    let mut c: Vec<Category> = d.categories.iter().filter(|c| c.parent_id == Some(parent_id)).cloned().collect();
    c.sort_by_key(|c| c.sort_order); Ok(c)
}

#[tauri::command]
fn add_sub_category(state: State<DbState>, path: State<DataPath>, parent_id: i64, name: String) -> Result<Category, String> {
    let mut d = state.0.lock().map_err(|e| e.to_string())?;
    if d.categories.iter().any(|c| c.parent_id == Some(parent_id) && c.name == name) { return Err(format!("分类\"{}\"已存在", name)); }
    let id = d.next_id; d.next_id += 1;
    let cat = Category { id, name, icon: String::new(), parent_id: Some(parent_id), is_default: false, sort_order: 99, created_at: now_str() };
    d.categories.push(cat.clone()); save_data(&path.0, &d); Ok(cat)
}

#[tauri::command]
fn delete_sub_category(state: State<DbState>, path: State<DataPath>, id: i64) -> Result<(), String> {
    let mut d = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(c) = d.categories.iter().find(|c| c.id == id) { if c.is_default { return Err("系统内置分类不可删除".into()); } }
    if d.expenses.iter().filter(|e| e.sub_category_id == Some(id)).count() > 0 { return Err("该分类下有记账记录，无法删除".into()); }
    d.categories.retain(|c| c.id != id); save_data(&path.0, &d); Ok(())
}

#[tauri::command]
fn add_expense(state: State<DbState>, path: State<DataPath>, data: AddExpenseData) -> Result<Expense, String> {
    let mut d = state.0.lock().map_err(|e| e.to_string())?;
    let id = d.next_id; d.next_id += 1; let now = now_str();
    // 先提取分类信息（不可变借用），再进行可变操作
    let cats_info: Vec<(i64, String, String)> = d.categories.iter().map(|c| (c.id, c.name.clone(), c.icon.clone())).collect();
    let cn = cats_info.iter().find(|(cid, _, _)| *cid == data.category_id).map(|(_, n, _)| n.clone());
    let ci = cats_info.iter().find(|(cid, _, _)| *cid == data.category_id).map(|(_, _, i)| i.clone());
    let sn = cats_info.iter().find(|(cid, _, _)| *cid == data.sub_category_id).map(|(_, n, _)| n.clone());
    let exp = Expense { id, amount: data.amount, category_id: data.category_id, sub_category_id: Some(data.sub_category_id), date: data.date, note: data.note.unwrap_or_default(), created_at: now.clone(), updated_at: now, category_name: cn, category_icon: ci, sub_category_name: sn };
    d.expenses.push(exp.clone()); save_data(&path.0, &d); Ok(exp)
}

#[tauri::command]
fn get_expenses(state: State<DbState>, filters: Option<ExpenseFilters>) -> Result<Vec<Expense>, String> {
    let d = state.0.lock().map_err(|e| e.to_string())?;
    let mut r: Vec<Expense> = d.expenses.iter().filter(|e| {
        if let Some(ref f) = filters {
            if let Some(ref s) = f.start_date { if e.date < *s { return false; } }
            if let Some(ref ed) = f.end_date { if e.date > *ed { return false; } }
            if let Some(c) = f.category_id { if e.category_id != c { return false; } }
            if let Some(ref kw) = f.keyword { if !e.note.contains(kw) { return false; } }
        }
        true
    }).cloned().collect();
    r.sort_by(|a, b| b.date.cmp(&a.date).then_with(|| b.created_at.cmp(&a.created_at))); Ok(r)
}

#[tauri::command]
fn update_expense(state: State<DbState>, path: State<DataPath>, id: i64, data: UpdateExpenseData) -> Result<(), String> {
    let mut d = state.0.lock().map_err(|e| e.to_string())?;
    // 先提取分类信息
    let cats_info: Vec<(i64, String, String)> = d.categories.iter().map(|c| (c.id, c.name.clone(), c.icon.clone())).collect();
    if let Some(exp) = d.expenses.iter_mut().find(|e| e.id == id) {
        if let Some(v) = data.amount { exp.amount = v; }
        if let Some(v) = data.category_id {
            exp.category_id = v;
            exp.category_name = cats_info.iter().find(|(cid,_,_)| *cid == v).map(|(_,n,_)| n.clone());
            exp.category_icon = cats_info.iter().find(|(cid,_,_)| *cid == v).map(|(_,_,i)| i.clone());
        }
        if let Some(v) = data.sub_category_id {
            exp.sub_category_id = Some(v);
            exp.sub_category_name = cats_info.iter().find(|(cid,_,_)| *cid == v).map(|(_,n,_)| n.clone());
        }
        if let Some(ref v) = data.date { exp.date = v.clone(); }
        if let Some(ref v) = data.note { exp.note = v.clone(); }
        exp.updated_at = now_str(); save_data(&path.0, &d);
    }
    Ok(())
}

#[tauri::command]
fn delete_expense(state: State<DbState>, path: State<DataPath>, id: i64) -> Result<(), String> {
    let mut d = state.0.lock().map_err(|e| e.to_string())?;
    d.expenses.retain(|e| e.id != id); save_data(&path.0, &d); Ok(())
}

#[tauri::command]
fn get_monthly_summary(state: State<DbState>, year: i32, month: u32) -> Result<MonthlySummary, String> {
    let d = state.0.lock().map_err(|e| e.to_string())?;
    let prefix = format!("{}-{:02}", year, month);
    let me: Vec<&Expense> = d.expenses.iter().filter(|e| e.date.starts_with(&prefix)).collect();
    let total: f64 = me.iter().map(|e| e.amount).sum();
    let pcs: Vec<&Category> = d.categories.iter().filter(|c| c.parent_id.is_none()).collect();
    let mut bc: Vec<CategorySummary> = pcs.iter().map(|cat| {
        let ces: Vec<&&Expense> = me.iter().filter(|e| e.category_id == cat.id).collect();
        CategorySummary { category_id: cat.id, category_name: cat.name.clone(), icon: cat.icon.clone(), total: ces.iter().map(|e| e.amount).sum(), count: ces.len() as i64 }
    }).collect();
    bc.sort_by(|a, b| b.total.partial_cmp(&a.total).unwrap_or(std::cmp::Ordering::Equal));
    Ok(MonthlySummary { total, by_category: bc })
}

#[tauri::command]
fn get_monthly_trend(state: State<DbState>, months: i32) -> Result<Vec<MonthlyTrendItem>, String> {
    let d = state.0.lock().map_err(|e| e.to_string())?;
    let mut r = Vec::new();
    let nd = (std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs() / 86400) as i64;
    for i in (0..months).rev() {
        let td = nd - (i as i64 * 30);
        let ms = format!("{}-{:02}", 1970 + td/365, (td%365)/30 + 1);
        let total: f64 = d.expenses.iter().filter(|e| e.date.starts_with(&ms)).map(|e| e.amount).sum();
        r.push(MonthlyTrendItem { month: ms, total });
    }
    Ok(r)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let data_dir = std::env::var("APPDATA").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from(".")).join("com.haoge.accounting");
    fs::create_dir_all(&data_dir).ok();
    let data_path = data_dir.join("haoge-data.json");
    let app_data = load_or_init(&data_path);
    tauri::Builder::default()
        .manage(DbState(Mutex::new(app_data))).manage(DataPath(data_path))
        .setup(|app| { if cfg!(debug_assertions) { app.handle().plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build())?; } Ok(()) })
        .invoke_handler(tauri::generate_handler![get_categories, get_sub_categories, add_sub_category, delete_sub_category, add_expense, get_expenses, update_expense, delete_expense, get_monthly_summary, get_monthly_trend])
        .run(tauri::generate_context!()).expect("error while running tauri application");
}
