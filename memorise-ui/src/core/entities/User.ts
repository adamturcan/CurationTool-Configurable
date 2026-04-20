/**
 * Immutable value object representing an authenticated user.
 * In standalone mode, id equals the username.
 * In server mode, id is the server-assigned user ID.
 *
 * @category Entities
 */
export type UserRole = 'admin' | 'user';

export interface UserProps {
  id: string;
  username: string;
  email?: string;
  role?: UserRole;
}

export class User {
  private readonly props: UserProps;

  private constructor(props: UserProps) {
    this.props = Object.freeze({ ...props });
  }

  static create(props: UserProps): User {
    if (!props.id?.trim()) throw new Error('User id is required');
    if (!props.username?.trim()) throw new Error('User username is required');
    return new User({
      id: props.id.trim(),
      username: props.username.trim(),
      email: props.email?.trim(),
      role: props.role,
    });
  }

  get id(): string { return this.props.id; }
  get username(): string { return this.props.username; }
  get email(): string | undefined { return this.props.email; }
  get role(): UserRole | undefined { return this.props.role; }
}
