import { changePasswordSchema, loginSchema, passwordField, signupSchema, nameField, addressField } from '@/lib/validation';

const base = { name: 'Rahul Sharma Test Customer', email: 'a@b.co', address: '1 Road', password: 'Valid@123', confirmPassword: 'Valid@123' };

describe('frontend validation mirrors backend rules', () => {
  it('name length 20-60 after trim', () => {
    expect(nameField.safeParse('a'.repeat(19)).success).toBe(false);
    expect(nameField.safeParse('a'.repeat(20)).success).toBe(true);
    expect(nameField.safeParse('a'.repeat(61)).success).toBe(false);
    expect(nameField.safeParse(' '.repeat(25)).success).toBe(false);
  });
  it('address max 400, required', () => {
    expect(addressField.safeParse('x'.repeat(401)).success).toBe(false);
    expect(addressField.safeParse('  ').success).toBe(false);
  });
  it.each([['Abcdef1!', true], ['abcdef1!', false], ['Abcdefg1', false], ['Ab1!', false], ['Abcdefgh12345678!', false]])('password %s', (pw, ok) => {
    expect(passwordField.safeParse(pw).success).toBe(ok);
  });
  it('signup requires matching passwords', () => {
    expect(signupSchema.safeParse(base).success).toBe(true);
    expect(signupSchema.safeParse({ ...base, confirmPassword: 'Other@123' }).success).toBe(false);
  });
  it('login requires email format and password', () => {
    expect(loginSchema.safeParse({ email: 'bad', password: 'x' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false);
  });
  it('change-password rejects reuse of the current password', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: 'Valid@123', newPassword: 'Valid@123', confirmPassword: 'Valid@123' }).success).toBe(false);
  });
});
