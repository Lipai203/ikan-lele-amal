const dotenv = require('dotenv');
const path = require('path');
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

function show(k){
  const v = process.env[k];
  if (v === undefined) return console.log(k + '=undefined');
  const masked = String(v).replace(/./g,'*');
  console.log(k + '='+masked);
}

show('SMTP_HOST');
show('SMTP_PORT');
show('SMTP_SECURE');
show('SMTP_USER');
// mask: only show whether placeholder
const p = process.env.SMTP_PASS || '';
console.log('SMTP_PASS_is_placeholder=' + (p.includes('your_') || p.includes('your')));
show('MAIL_TO');
show('MAIL_FROM');
show('PORT');

