// scripts/login.js
import { supabase } from './supabase.js';

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = e.target.email.value;
  const password = e.target.password.value;

  const { error, data } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    document.getElementById('loginError').textContent = error.message;
  } else {
    // Redirect to dashboard (index.html)
    window.location.href = 'index.html';
  }
});
