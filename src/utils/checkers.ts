const checkPassword = (password: string) => {
  return (
    checkPasswordLength(password) &&
    checkPasswordLowercase(password) &&
    checkPasswordUppercase(password) &&
    checkPasswordNumberSymbol(password)
  );
};

const checkPasswordLength = (password: string) => {
  return password?.length >= 6;
};

const checkPasswordUppercase = (password: string) => {
  return /[A-Z]+/.test(password);
};

const checkPasswordLowercase = (password: string) => {
  return /[a-z]+/.test(password);
};

const checkPasswordNumber = (password: string) => {
  return /[0-9]+/.test(password);
};

const checkPasswordNumberSymbol = (password: string) => {
  return checkPasswordNumber(password) || /[^a-zA-Z0-9 ]+/.test(password);
};

const checkPasswordSymbol = (password: string) => {
  return checkPasswordNumber(password) || /[^a-zA-Z0-9 ]+/.test(password);
};

const checkEmail = (email: string) => {
  const emailFormat =
    /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9]{2,}/gi;

  return emailFormat.test(email);
};

const checkMatchPassword = (password: string, passwordConfrim: string) =>
  password === passwordConfrim;

export {
  checkPassword,
  checkPasswordLength,
  checkEmail,
  checkPasswordLowercase,
  checkPasswordNumber,
  checkPasswordNumberSymbol,
  checkPasswordUppercase,
  checkMatchPassword,
  checkPasswordSymbol,
};
