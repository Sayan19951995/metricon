import { supabase } from './supabase/client';

// Регистрация
export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (error) throw error;

  // Создаём запись в таблице users
  if (data.user) {
    const { error: userError } = await supabase.from('users').insert({
      id: data.user.id,
      email: data.user.email!,
      name: name,
    });

    if (userError) console.error('Error creating user record:', userError);
  }

  return data;
}

// Вход
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

// Выход
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Получить текущего пользователя
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Получить сессию
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Сброс пароля
export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) throw error;
  return data;
}

// Обновить пароль
export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
  return data;
}

// Вход через Google
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/app`,
    },
  });

  if (error) throw error;
  return data;
}
