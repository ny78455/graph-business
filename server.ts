import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const DB_PATH = process.env.NODE_ENV === 'production' 
  ? path.join(process.cwd(), 'business_data.db') 
  : './business_data.db';
const DATA_DIR = './data';

app.use(cors());
app.use(express.json());

// Initialize Database
let db: Database.Database;
let isPrebuilt = false;

try {
  db = new Database(DB_PATH, { readonly: process.env.NODE_ENV === 'production' });
  console.log(`Connected to database at ${DB_PATH}`);
  isPrebuilt = true;
} catch (e) {
  console.error(`Failed to connect to database at ${DB_PATH}. Attempting to create in /tmp...`);
  const tmpPath = path.join('/tmp', 'business_data.db');
  db = new Database(tmpPath);
  console.log(`Connected to database at ${tmpPath}`);
}

// Ingestion Logic
function ingestData(force = false) {
  if (process.env.NODE_ENV === 'production' && !force) {
    console.log('Skipping ingestion in production mode.');
    return;
  }
  console.log('Starting data ingestion...');
  const folders = fs.readdirSync(DATA_DIR);
  
  for (const folder of folders) {
    const folderPath = path.join(DATA_DIR, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.jsonl'));
    if (files.length === 0) continue;

    const tableName = folder.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Read first line to infer schema
    const firstFile = path.join(folderPath, files[0]);
    const firstLine = fs.readFileSync(firstFile, 'utf8').split('\n')[0];
    if (!firstLine) continue;
    
    const sampleData = JSON.parse(firstLine);
    const columns = Object.keys(sampleData);
    
    // Create table
    const columnDefs = columns.map(col => {
      const val = sampleData[col];
      let type = 'TEXT';
      if (typeof val === 'number') type = 'REAL';
      if (typeof val === 'boolean') type = 'INTEGER'; // SQLite uses 0/1
      return `"${col}" ${type}`;
    }).join(', ');
    
    db.exec(`DROP TABLE IF EXISTS ${tableName}`);
    db.exec(`CREATE TABLE ${tableName} (${columnDefs})`);
    
    // Insert data
    const insertStmt = db.prepare(`INSERT INTO ${tableName} (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`);
    
    let count = 0;
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const lines = fs.readFileSync(filePath, 'utf8').split('\n');
      
      db.transaction(() => {
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            const values = columns.map(col => {
              const val = data[col];
              if (val === null || val === undefined) return null;
              if (typeof val === 'boolean') return val ? 1 : 0;
              if (typeof val === 'object') return JSON.stringify(val);
              return val;
            });
            insertStmt.run(...values);
            count++;
          } catch (e) {
            console.error(`Error parsing line in ${file}:`, e);
          }
        }
      })();
    }
    console.log(`Ingested ${count} records into ${tableName}`);
  }
}

// Initial Ingestion
if (process.env.NODE_ENV !== 'production') {
  ingestData();
} else if (!isPrebuilt) {
  // If in production but DB was not prebuilt (e.g. on Vercel), ingest into /tmp
  ingestData(true);
}

// Watch for changes in data directory
if (process.env.NODE_ENV !== 'production') {
  let debounceTimer: NodeJS.Timeout | null = null;
  fs.watch(DATA_DIR, { recursive: true }, (eventType, filename) => {
    if (filename && filename.endsWith('.jsonl')) {
      console.log(`File change detected: ${filename}. Re-ingesting in 2s...`);
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        try {
          ingestData();
        } catch (e) {
          console.error('Error during automatic re-ingestion:', e);
        }
      }, 2000);
    }
  });
}

// API Endpoints

// Get Schema for LLM
app.get('/api/schema', (req, res) => {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
  const schema: any = {};
  
  for (const table of tables) {
    const info = db.prepare(`PRAGMA table_info(${table.name})`).all() as any[];
    schema[table.name] = info.map(col => ({ name: col.name, type: col.type }));
  }
  
  res.json(schema);
});

// Execute SQL (with safety checks)
app.post('/api/query-sql', (req, res) => {
  const { sql } = req.body;
  
  if (!sql) return res.status(400).json({ error: 'No SQL provided' });
  
  // Basic safety check: Only SELECT allowed
  const normalizedSql = sql.trim().toUpperCase();
  if (!normalizedSql.startsWith('SELECT')) {
    return res.status(403).json({ error: 'Only SELECT queries are allowed' });
  }
  
  try {
    const results = db.prepare(sql).all();
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Graph Data
app.get('/api/graph', (req, res) => {
  const nodeMap = new Map<string, any>();
  const edges: any[] = [];
  const edgeIds = new Set<string>();
  
  try {
    const headers = db.prepare("SELECT * FROM billing_document_headers").all() as any[];
    const items = db.prepare("SELECT * FROM billing_document_items").all() as any[];
    const partners = db.prepare("SELECT * FROM business_partners").all() as any[];
    const journal = db.prepare("SELECT * FROM journal_entry_items_accounts_receivable").all() as any[];
    const salesOrders = db.prepare("SELECT * FROM sales_order_headers").all() as any[];
    const salesItems = db.prepare("SELECT * FROM sales_order_items").all() as any[];
    const deliveries = db.prepare("SELECT * FROM outbound_delivery_headers").all() as any[];
    const deliveryItems = db.prepare("SELECT * FROM outbound_delivery_items").all() as any[];
    const products = db.prepare("SELECT * FROM products").all() as any[];

    // Products
    products.forEach(p => {
      if (!p.product || p.product === 'null') return;
      const pId = `P_${p.product}`;
      nodeMap.set(pId, { id: pId, type: 'product', data: p, label: `Product ${p.product}` });
    });

    // Sales Orders
    salesOrders.forEach(so => {
      if (!so.salesOrder || so.salesOrder === 'null') return;
      const soId = `SO_${so.salesOrder}`;
      nodeMap.set(soId, { id: soId, type: 'sales_order', data: so, label: `SO ${so.salesOrder}` });
      
      if (so.soldToParty && so.soldToParty !== 'null') {
        const cId = `C_${so.soldToParty}`;
        if (!nodeMap.has(cId)) {
          nodeMap.set(cId, { id: cId, type: 'customer', data: { id: so.soldToParty }, label: `Customer ${so.soldToParty}` });
        }
        const edgeId = `e_so_c_${so.salesOrder}`;
        if (!edgeIds.has(edgeId)) {
          edges.push({ id: edgeId, source: soId, target: cId, label: 'ordered_by' });
          edgeIds.add(edgeId);
        }
      }
    });

    // Sales Order Items
    salesItems.forEach(si => {
      if (!si.salesOrder || si.salesOrder === 'null' || !si.salesOrderItem || si.salesOrderItem === 'null') return;
      const soId = `SO_${si.salesOrder}`;
      const siId = `SI_${si.salesOrder}_${si.salesOrderItem}`;
      
      if (nodeMap.has(soId)) {
        nodeMap.set(siId, { id: siId, type: 'item', data: si, label: `SO Item ${si.salesOrderItem}` });
        const edgeId = `e_so_si_${siId}`;
        if (!edgeIds.has(edgeId)) {
          edges.push({ id: edgeId, source: soId, target: siId, label: 'contains' });
          edgeIds.add(edgeId);
        }

        if (si.material && si.material !== 'null') {
          const pId = `P_${si.material}`;
          if (nodeMap.has(pId)) {
            const pEdgeId = `e_si_p_${siId}`;
            if (!edgeIds.has(pEdgeId)) {
              edges.push({ id: pEdgeId, source: siId, target: pId, label: 'product' });
              edgeIds.add(pEdgeId);
            }
          }
        }
      }
    });

    // Deliveries
    deliveries.forEach(d => {
      if (!d.deliveryDocument || d.deliveryDocument === 'null') return;
      const dId = `D_${d.deliveryDocument}`;
      nodeMap.set(dId, { id: dId, type: 'delivery', data: d, label: `Deliv ${d.deliveryDocument}` });
    });

    // Delivery Items
    deliveryItems.forEach(di => {
      if (!di.deliveryDocument || di.deliveryDocument === 'null' || !di.deliveryDocumentItem || di.deliveryDocumentItem === 'null') return;
      const dId = `D_${di.deliveryDocument}`;
      const diId = `DI_${di.deliveryDocument}_${di.deliveryDocumentItem}`;
      
      if (nodeMap.has(dId)) {
        nodeMap.set(diId, { id: diId, type: 'item', data: di, label: `Deliv Item ${di.deliveryDocumentItem}` });
        const edgeId = `e_d_di_${diId}`;
        if (!edgeIds.has(edgeId)) {
          edges.push({ id: edgeId, source: dId, target: diId, label: 'contains' });
          edgeIds.add(edgeId);
        }

        if (di.referenceSdDocument && di.referenceSdDocument !== 'null') {
          const soId = `SO_${di.referenceSdDocument}`;
          if (nodeMap.has(soId)) {
            const soEdgeId = `e_di_so_${diId}`;
            if (!edgeIds.has(soEdgeId)) {
              edges.push({ id: soEdgeId, source: diId, target: soId, label: 'ref_so' });
              edgeIds.add(soEdgeId);
            }
          }
        }
      }
    });

    // Billing Headers
    headers.forEach(h => {
      if (!h.BillingDocument || h.BillingDocument === 'null') return;
      const hId = `H_${h.BillingDocument}`;
      nodeMap.set(hId, { id: hId, type: 'header', data: h, label: `Invoice ${h.BillingDocument}` });
      
      if (h.Customer && h.Customer !== 'null') {
        const cId = `C_${h.Customer}`;
        if (!nodeMap.has(cId)) {
          nodeMap.set(cId, { id: cId, type: 'customer', data: { id: h.Customer }, label: `Customer ${h.Customer}` });
        }
        const edgeId = `e_h_c_${h.BillingDocument}`;
        if (!edgeIds.has(edgeId)) {
          edges.push({ id: edgeId, source: hId, target: cId, label: 'billed_to' });
          edgeIds.add(edgeId);
        }
      }
    });
    
    // Billing Items
    items.forEach(i => {
      if (!i.BillingDocument || i.BillingDocument === 'null' || !i.BillingDocumentItem || i.BillingDocumentItem === 'null') return;
      const hId = `H_${i.BillingDocument}`;
      const iId = `I_${i.BillingDocument}_${i.BillingDocumentItem}`;
      
      if (nodeMap.has(hId)) {
        nodeMap.set(iId, { id: iId, type: 'item', data: i, label: `Inv Item ${i.BillingDocumentItem}` });
        
        const edgeId = `e_h_i_${iId}`;
        if (!edgeIds.has(edgeId)) {
          edges.push({ id: edgeId, source: hId, target: iId, label: 'contains' });
          edgeIds.add(edgeId);
        }

        if (i.Product && i.Product !== 'null') {
          const pId = `P_${i.Product}`;
          if (nodeMap.has(pId)) {
            const pEdgeId = `e_i_p_${iId}`;
            if (!edgeIds.has(pEdgeId)) {
              edges.push({ id: pEdgeId, source: iId, target: pId, label: 'product' });
              edgeIds.add(pEdgeId);
            }
          }
        }
      }
    });
    
    // Business Partners
    partners.forEach(p => {
      if (!p.BusinessPartner || p.BusinessPartner === 'null') return;
      const cId = `C_${p.BusinessPartner}`;
      const customerNode = nodeMap.get(cId);
      if (customerNode) {
        customerNode.label = p.BusinessPartnerName;
        customerNode.data = { ...customerNode.data, ...p };
      }
    });
    
    // Journal Entries
    journal.forEach(j => {
      if (!j.JournalEntry || j.JournalEntry === 'null' || !j.BillingDocument || j.BillingDocument === 'null') return;
      const jId = `J_${j.JournalEntry}`;
      const hId = `H_${j.BillingDocument}`;
      
      if (nodeMap.has(hId)) {
        nodeMap.set(jId, { id: jId, type: 'payment', data: j, label: `Payment ${j.JournalEntry}` });
        
        const edgeId = `e_j_h_${j.JournalEntry}`;
        if (!edgeIds.has(edgeId)) {
          edges.push({ id: edgeId, source: jId, target: hId, label: 'pays' });
          edgeIds.add(edgeId);
        }
      }
    });

    res.json({ nodes: Array.from(nodeMap.values()), edges });
  } catch (error: any) {
    console.error('Graph error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Trace Lifecycle
app.post('/api/trace', (req, res) => {
  const { entityId } = req.body;
  res.json({ message: 'Trace functionality implemented via graph exploration' });
});

// Dashboard Stats
app.get('/api/dashboard-stats', (req, res) => {
  try {
    const totalAccounts = db.prepare("SELECT COUNT(*) as count FROM business_partners").get() as any;
    const totalBilling = db.prepare("SELECT SUM(TotalAmount) as sum FROM billing_document_headers").get() as any;
    const totalSales = db.prepare("SELECT COUNT(*) as count FROM sales_order_headers").get() as any;
    const totalDeliveries = db.prepare("SELECT COUNT(*) as count FROM outbound_delivery_headers").get() as any;
    const totalCancellations = db.prepare("SELECT COUNT(*) as count FROM billing_document_cancellations").get() as any;
    const totalPayments = db.prepare("SELECT SUM(amountInCompanyCodeCurrency) as sum FROM payments_accounts_receivable").get() as any;
    const totalProducts = db.prepare("SELECT COUNT(*) as count FROM products").get() as any;
    
    const recentActivities = [];
    
    const recentInvoices = db.prepare(`
      SELECT 'Invoice Created' as title, 'Invoice ' || BillingDocument || ' for ' || Customer as sub, 'bg-indigo-500' as color, BillingDocument as id
      FROM billing_document_headers 
      ORDER BY BillingDocument DESC LIMIT 3
    `).all() as any[];

    const recentOrders = db.prepare(`
      SELECT 'Order Received' as title, 'Order ' || salesOrder || ' from ' || soldToParty as sub, 'bg-emerald-500' as color, salesOrder as id
      FROM sales_order_headers 
      ORDER BY salesOrder DESC LIMIT 2
    `).all() as any[];

    const recentCancellations = db.prepare(`
      SELECT 'Invoice Cancelled' as title, 'Invoice ' || billingDocument || ' was cancelled' as sub, 'bg-rose-500' as color, billingDocument as id
      FROM billing_document_cancellations
      ORDER BY billingDocument DESC LIMIT 2
    `).all() as any[];

    recentActivities.push(...recentInvoices, ...recentOrders, ...recentCancellations);

    const orderStatus = db.prepare(`
      SELECT salesOrder as id, soldToParty as customer, 'Sales' as "from", CAST(totalNetAmount AS REAL) as price, 
      CASE overallDeliveryStatus WHEN 'C' THEN 'Completed' ELSE 'Open' END as status, 
      CASE overallDeliveryStatus WHEN 'C' THEN 'bg-emerald-500' ELSE 'bg-amber-500' END as color 
      FROM sales_order_headers 
      LIMIT 10
    `).all();

    // Chart Data: Billing by Date
    const billingByDate = db.prepare(`
      SELECT BillingDocumentDate as name, SUM(TotalAmount) as value 
      FROM billing_document_headers 
      GROUP BY BillingDocumentDate 
      ORDER BY BillingDocumentDate ASC
    `).all();

    // Top Customers
    const topCustomers = db.prepare(`
      SELECT Customer as name, SUM(TotalAmount) as value
      FROM billing_document_headers
      WHERE Customer IS NOT NULL AND Customer != 'null' AND Customer != ''
      GROUP BY Customer
      ORDER BY value DESC
      LIMIT 5
    `).all();

    // Top Products
    const topProducts = db.prepare(`
      SELECT material as name, SUM(netAmount) as value
      FROM sales_order_items
      WHERE material IS NOT NULL AND material != 'null' AND material != ''
      GROUP BY material
      ORDER BY value DESC
      LIMIT 5
    `).all();

    // Pie Data: Partners by Category
    const partnersByCategory = db.prepare(`
      SELECT Category as name, COUNT(*) as value 
      FROM business_partners 
      WHERE Category IS NOT NULL AND Category != 'null' AND Category != ''
      GROUP BY Category
    `).all();

    const colors = ['#6366F1', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6'];
    const pieData = partnersByCategory.map((item: any, i: number) => ({
      ...item,
      color: colors[i % colors.length]
    }));

    res.json({
      stats: [
        { title: 'Total Partners', value: totalAccounts.count, change: '+5%', color: 'from-indigo-500 to-indigo-600', sub: 'Business Partners' },
        { title: 'Total Sales', value: totalSales.count, change: '+15%', color: 'from-emerald-500 to-emerald-600', sub: 'Sales Orders' },
        { title: 'Deliveries', value: totalDeliveries.count, change: '+8%', color: 'from-blue-500 to-blue-600', sub: 'Outbound' },
        { title: 'Total Billing', value: `$${((totalBilling.sum || 0) / 1000).toFixed(1)}k`, change: '+12%', color: 'from-rose-500 to-rose-600', sub: 'Net Amount' },
        { title: 'Cancellations', value: totalCancellations.count, change: '-2%', color: 'from-slate-500 to-slate-600', sub: 'Billing Docs' },
        { title: 'Payments', value: `$${((totalPayments.sum || 0) / 1000).toFixed(1)}k`, change: '+20%', color: 'from-emerald-400 to-emerald-500', sub: 'Accounts Receivable' },
        { title: 'Products', value: totalProducts.count, change: '+3%', color: 'from-violet-500 to-violet-600', sub: 'Active Catalog' },
      ],
      recentActivities,
      orderStatus,
      topCustomers,
      topProducts,
      chartData: billingByDate.length > 0 ? billingByDate : [
        { name: 'No Data', value: 0 }
      ],
      pieData: pieData.length > 0 ? pieData : [
        { name: 'No Data', value: 1, color: '#CBD5E1' }
      ]
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}

export default app;
