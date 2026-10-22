import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '@/features/auth/LoginPage';
import { SignupPage } from '@/features/auth/SignupPage';
import { ChangePasswordPage } from '@/features/account/ChangePasswordPage';
import { authService } from '@/services/auth.service';
import { ApiError } from '@/lib/api';
import { makeUser, renderApp } from './utils';

vi.mock('@/services/auth.service', () => ({
  authService: { register: vi.fn(), changePassword: vi.fn(), me: vi.fn(), login: vi.fn(), logout: vi.fn() },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() }, Toaster: () => null }));

beforeEach(() => vi.clearAllMocks());

describe('LoginPage', () => {
  it('shows validation errors and does not call the API', async () => {
    const { auth } = renderApp(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
  });
  it('rejects a malformed email', async () => {
    renderApp(<LoginPage />);
    await userEvent.type(screen.getByLabelText('Email'), 'nope');
    await userEvent.type(screen.getByLabelText('Password'), 'x');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
  });
  it('has no role selector and links to signup', () => {
    renderApp(<LoginPage />);
    expect(screen.queryByLabelText(/role/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute('href', '/signup');
  });
  it('submits credentials and displays server errors', async () => {
    const login = vi.fn().mockRejectedValue(new ApiError(401, 'Invalid email or password'));
    renderApp(<LoginPage />, { auth: { login } });
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co');
    await userEvent.type(screen.getByLabelText('Password'), 'Whatever@1');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(login).toHaveBeenCalledWith('a@b.co', 'Whatever@1');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });
});

describe('SignupPage', () => {
  it('enforces name, password and confirmation rules inline', async () => {
    renderApp(<SignupPage />);
    await userEvent.type(screen.getByLabelText('Full name'), 'Too short');
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co');
    await userEvent.type(screen.getByLabelText('Address'), '1 Road');
    await userEvent.type(screen.getByLabelText('Password'), 'weak');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'different');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(await screen.findByText('Name must be at least 20 characters')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(authService.register).not.toHaveBeenCalled();
  });
  it('submits valid data without confirmPassword/role and shows duplicate-email errors', async () => {
    vi.mocked(authService.register).mockRejectedValue(new ApiError(409, 'An account with this email already exists', [{ field: 'email', message: 'An account with this email already exists' }]));
    renderApp(<SignupPage />);
    await userEvent.type(screen.getByLabelText('Full name'), 'Rahul Sharma Test Customer');
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co');
    await userEvent.type(screen.getByLabelText('Address'), '1 Road');
    await userEvent.type(screen.getByLabelText('Password'), 'Valid@123');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Valid@123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => expect(authService.register).toHaveBeenCalledWith({ name: 'Rahul Sharma Test Customer', email: 'a@b.co', address: '1 Road', password: 'Valid@123' }));
    expect((await screen.findAllByText('An account with this email already exists')).length).toBeGreaterThan(0);
  });
});

describe('ChangePasswordPage', () => {
  const fill = async (cur: string, next: string, conf: string) => {
    await userEvent.type(screen.getByLabelText('Current password'), cur);
    await userEvent.type(screen.getByLabelText('New password'), next);
    await userEvent.type(screen.getByLabelText('Confirm new password'), conf);
    await userEvent.click(screen.getByRole('button', { name: /update password/i }));
  };
  it('validates the new password and confirmation', async () => {
    renderApp(<ChangePasswordPage />, { user: makeUser('USER') });
    await fill('Old@1234', 'weak', 'nope');
    expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(authService.changePassword).not.toHaveBeenCalled();
  });
  it('sends current + new password and shows backend errors on the field', async () => {
    vi.mocked(authService.changePassword).mockRejectedValueOnce(new ApiError(400, 'Current password is incorrect', [{ field: 'currentPassword', message: 'Current password is incorrect' }]));
    renderApp(<ChangePasswordPage />, { user: makeUser('USER') });
    await fill('Old@1234', 'New@12345', 'New@12345');
    await waitFor(() => expect(authService.changePassword).toHaveBeenCalledWith({ currentPassword: 'Old@1234', newPassword: 'New@12345' }));
    expect((await screen.findAllByText('Current password is incorrect')).length).toBeGreaterThan(0);
  });
});
