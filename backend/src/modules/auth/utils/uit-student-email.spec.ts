import { isUitStudentEmail } from './uit-student-email.js';

describe('isUitStudentEmail', () => {
  it.each(['student@gm.uit.edu.vn', 'abc123@gm.uit.edu.vn', '  Student@GM.UIT.EDU.VN  '])(
    'accepts %s',
    (email) => {
      expect(isUitStudentEmail(email)).toBe(true);
    },
  );

  it.each([
    'student@gmail.com',
    'student@uit.edu.vn',
    'student@gm.uit.edu.vn.fake.com',
    'student@fake-gm.uit.edu.vn',
    'student@sub.gm.uit.edu.vn',
    'not-an-email',
    'student@gm.uit.edu.vn extra',
    '@gm.uit.edu.vn',
    'student@',
  ])('rejects %s', (email) => {
    expect(isUitStudentEmail(email)).toBe(false);
  });
});
