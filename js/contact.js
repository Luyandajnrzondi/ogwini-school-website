import { supabase } from './supabase-client.js';

const form = document.getElementById('contact-form');
const feedback = document.getElementById('contact-feedback');
const submitButton = form.querySelector('button[type="submit"]');

function setContactValue(id, value, type) {
  const element = document.getElementById(id);
  if (!value) {
    element.textContent = 'Not currently available';
    return;
  }
  const link = document.createElement('a');
  link.href = type === 'email' ? `mailto:${value}` : type === 'phone' ? `tel:${value.replace(/\s/g, '')}` : '#';
  link.textContent = value;
  if (type) element.replaceChildren(link);
  else element.textContent = value;
}

async function loadContactDetails() {
  const { data, error } = await supabase.from('school_information').select('school_email,school_phone,school_address').limit(1).maybeSingle();
  if (error || !data) {
    ['school-email', 'school-phone', 'school-address'].forEach((id) => { document.getElementById(id).textContent = 'Not currently available'; });
    return;
  }
  setContactValue('school-email', data.school_email, 'email');
  setContactValue('school-phone', data.school_phone, 'phone');
  setContactValue('school-address', data.school_address);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  feedback.hidden = true;
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  submitButton.disabled = true;
  submitButton.textContent = 'Sending…';
  const values = new FormData(form);
  const payload = {
    name: String(values.get('name') || '').trim(),
    email: String(values.get('email') || '').trim() || null,
    phone: String(values.get('phone') || '').trim() || null,
    subject: String(values.get('subject') || '').trim() || null,
    message: String(values.get('message') || '').trim()
  };
  const { error } = await supabase.from('contact_messages').insert(payload);
  submitButton.disabled = false;
  submitButton.textContent = 'Send Message';
  feedback.hidden = false;
  if (error) {
    feedback.textContent = 'Your message could not be sent. Please try again or contact the school directly.';
    feedback.classList.add('admin-msg--error');
    return;
  }
  feedback.classList.remove('admin-msg--error');
  feedback.textContent = 'Thank you. Your message has been sent to the school.';
  form.reset();
});

loadContactDetails();
