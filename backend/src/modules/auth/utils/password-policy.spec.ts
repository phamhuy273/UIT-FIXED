import { isAcceptablePassword } from './password-policy.js';

describe('isAcceptablePassword', () => {
  it('accepts a password with letters and a digit', () => {
    expect(isAcceptablePassword('Secret12')).toBe(true);
  });

  it.each(['short1', 'onlyletters', '12345678', '   ', ''])('rejects %s', (password) => {
    expect(isAcceptablePassword(password)).toBe(false);
  });

  it('rejects a password longer than 72 bytes', () => {
    expect(isAcceptablePassword(`${'a'.repeat(72)}1`)).toBe(false);
  });
});
