// Test email küldés Resend-del
const { Resend } = require('resend');

const resend = new Resend('re_MEq2fb6e_BxGewtTUXp8KC2LJG82jXTjK');

async function testEmail() {
  console.log('📧 Testing Resend API...');
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'Pharmagister VF <noreply@valifriend.com>',
      to: ['epresl@gmail.com'], // Cseréld le a saját emailedre
      subject: 'Test Email - Pharmagister',
      html: '<h1>Test email</h1><p>Ha megkapod, akkor működik a Resend!</p>',
    });

    if (error) {
      console.error('❌ Hiba:', error);
    } else {
      console.log('✅ Email sikeresen elküldve!');
      console.log('Email ID:', data.id);
    }
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

testEmail();
