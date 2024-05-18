// PASSWORDS MVU
type RequireUppercase = { type: "RequireUppercase" };

type RequireLowercase = { type: "RequireLowercase" };

type MinimumLength = { type: "MinimumLength"; length: number };

type RequireNumber = { type: "RequireNumber" };

type RequireSpecialChar = { type: "RequireSpecialChar" };

type PasswordCriteria = RequireUppercase | RequireLowercase | MinimumLength | RequireNumber | RequireSpecialChar;

type PasswordStrength = "Weak" | "Moderate" | "Strong";

type Password = string;

type Criteria = PasswordCriteria[];

type Strength = PasswordStrength;

type Model = [password: Password, criteria: Criteria, strength: Strength];

const initialModel: Model = [
  "",
  [
    { type: "MinimumLength", length: 8 },
    { type: "RequireUppercase" },
    { type: "RequireLowercase" },
    { type: "RequireNumber" },
    { type: "RequireSpecialChar" },
  ],
  "Weak",
];

type UpdatePassword = { type: "UpdatePassword"; password: string };
type ClearCriteria = { type: "ClearCriteria" };
type AddCriterion = { type: "AddCriterion"; criterion: PasswordCriteria };
type RemoveCriterion = { type: "RemoveCriterion"; criterion: PasswordCriteria };

type Action = UpdatePassword | ClearCriteria | AddCriterion | RemoveCriterion;

const meetsMinLength: (password: string, len: number) => boolean = (password, len) => {
  return password.length >= len;
};

const hasFromSet: (password: Password, set: string) => boolean = (password, set) => {
  const loop: (s: string) => boolean = (s) => {
    if (s.length === 0) {
      return false;
    } else {
      const first = s[0];
      if (set.includes(first)) {
        return true;
      } else {
        return loop(s.slice(1));
      }
    }
  };
  return loop(password);
};

const hasUppercase: (password: Password) => boolean = (password) => {
  return hasFromSet(password, "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
};

const hasLowercase: (password: Password) => boolean = (password) => {
  return hasFromSet(password, "abcdefghijklmnopqrstuvwxyz");
};

const hasNumber: (password: Password) => boolean = (password) => {
  return hasFromSet(password, "0123456789");
};

const hasSpecialChar: (password: Password) => boolean = (password) => {
  return hasFromSet(password, "!@#$%^&*()-_=+[]{}|;:,.<>?");
};

const meetsCriterion: (password: Password, criterion: PasswordCriteria) => boolean = (password, criterion) => {
  switch (criterion.type) {
    case "RequireUppercase":
      return hasUppercase(password);
    case "RequireLowercase":
      return hasLowercase(password);
    case "MinimumLength":
      return meetsMinLength(password, criterion.length);
    case "RequireNumber":
      return hasNumber(password);
    case "RequireSpecialChar":
      return hasSpecialChar(password);
  }
};

const metCriteria: (password: Password, criteria: PasswordCriteria[]) => PasswordCriteria[] = (password, criteria) => {
  return criteria.filter((c: PasswordCriteria) => meetsCriterion(password, c));
};

const strength_of: (num_criteria_met: number) => PasswordStrength = (num_criteria_met) => {
  switch (num_criteria_met) {
    case 0:
    case 1:
    case 2:
      return "Weak";
    case 3:
      return "Moderate";
    case 4:
    case 5:
      return "Strong";
    default:
      return "Strong";
  }
};

const calculateStrength: (password: Password, criteria: PasswordCriteria[]) => PasswordStrength = (password, criteria) => {
  return strength_of(metCriteria(password, criteria).length);
};

export { Model, Action, RequireUppercase, RequireLowercase, MinimumLength, RequireNumber, RequireSpecialChar, PasswordCriteria, PasswordStrength, Password, Criteria, Strength, initialModel, UpdatePassword, ClearCriteria, AddCriterion, RemoveCriterion, meetsMinLength, hasFromSet, hasUppercase, hasLowercase, hasNumber, hasSpecialChar, meetsCriterion, metCriteria, strength_of, calculateStrength };
