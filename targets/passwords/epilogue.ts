// import { RequireUppercase, RequireLowercase, MinimumLength, RequireNumber, RequireSpecialChar, PasswordCriteria, PasswordStrength, Password, Criteria, Strength, Model, initialModel, UpdatePassword, ClearCriteria, AddCriterion, RemoveCriterion, Action, meetsMinLength, hasFromSet, hasUppercase, hasLowercase, hasNumber, hasSpecialChar, meetsCriterion, metCriteria, strength_of, calculateStrength } from "./prelude";
import { initialModel } from "./prelude";
import { update } from "./sketch";

// PASSWORDS MVU EPILOGUE

const test1 = (): { result: boolean; values: any[] } => {
  const model = update(initialModel, { type: "ClearCriteria" });
  const [, criteria,] = model;
  return {
    result: criteria.length === 0,
    values: [criteria.length, 0],
  };
};

const test2 = (): { result: boolean; values: any[] } => {
  let model = update(initialModel, { type: "ClearCriteria" });
  model = update(model, { type: "AddCriterion", criterion: { type: "RequireUppercase" } });
  const [, criteria,] = model;
  return {
    result: criteria.length === 1,
    values: [criteria.length, 1],
  };
};

const test3 = (): { result: boolean; values: any[] } => {
  const model = update(initialModel, { type: "UpdatePassword", password: "pass" });
  const [password, , strength] = model;
  return {
    result: password === "pass" && strength === "Weak",
    values: [password, "pass", strength, "Weak"],
  };
};

const test4 = (): { result: boolean; values: any[] } => {
  const model = update(initialModel, { type: "UpdatePassword", password: "password" });
  const [password, , strength] = model;
  return {
    result: password === "password" && strength === "Weak",
    values: [password, "password", strength, "Weak"],
  };
};

const test5 = (): { result: boolean; values: any[] } => {
  const model = update(initialModel, { type: "UpdatePassword", password: "Password123" });
  const [password, , strength] = model;
  return {
    result: password === "Password123" && strength === "Strong",
    values: [password, "Password123", strength, "Strong"],
  };
};

const test6 = (): { result: boolean; values: any[] } => {
  const model = update(initialModel, { type: "UpdatePassword", password: "Password123!" });
  const [password, , strength] = model;
  return {
    result: password === "Password123!" && strength === "Strong",
    values: [password, "Password123!", strength, "Strong"],
  };
};

const test7 = (): { result: boolean; values: any[] } => {
  let model = update(initialModel, { type: "UpdatePassword", password: "password" });
  model = update(model, { type: "AddCriterion", criterion: { type: "RequireUppercase" } });
  const [password, criteria, strength] = model;
  return {
    result: password === "password" && criteria.length === 6 && strength === "Weak",
    values: [password, "password", criteria.length, 6, strength, "Weak"],
  };
};

const test8 = (): { result: boolean; values: any[] } => {
  let model = update(initialModel, { type: "UpdatePassword", password: "Password123!" });
  model = update(model, { type: "RemoveCriterion", criterion: { type: "RequireUppercase" } });
  const [password, criteria, strength] = model;
  return {
    result: password === "Password123!" && criteria.length === 4 && strength === "Strong",
    values: [password, "Password123!", criteria.length, 4, strength, "Strong"],
  };
};

const test9 = (): { result: boolean; values: any[] } => {
  let model = update(initialModel, { type: "UpdatePassword", password: "pass" });
  model = update(model, { type: "RemoveCriterion", criterion: { type: "MinimumLength", length: 8 } });
  const [password, criteria, strength] = model;
  return {
    result: password === "pass" && criteria.length === 4 && strength === "Weak",
    values: [password, "pass", criteria.length, 4, strength, "Weak"],
  };
};

const test10 = (): { result: boolean; values: any[] } => {
  let model = update(initialModel, { type: "UpdatePassword", password: "Passw0rd!" });
  model = update(model, { type: "RemoveCriterion", criterion: { type: "RequireSpecialChar" } });
  const [password, criteria, strength] = model;
  return {
    result: password === "Passw0rd!" && criteria.length === 4 && strength === "Strong",
    values: [password, "Passw0rd!", criteria.length, 4, strength, "Strong"],
  };
};

const test11 = (): { result: boolean; values: any[] } => {
  let model = update(initialModel, { type: "UpdatePassword", password: "password123" });
  model = update(model, { type: "AddCriterion", criterion: { type: "RequireSpecialChar" } });
  const [password, criteria, strength] = model;
  return {
    result: password === "password123" && criteria.length === 6 && strength === "Moderate",
    values: [password, "password123", criteria.length, 6, strength, "Moderate"],
  };
};

const test12 = (): { result: boolean; values: any[] } => {
  let model = update(initialModel, { type: "UpdatePassword", password: "P@ssw0rd!" });
  model = update(model, { type: "RemoveCriterion", criterion: { type: "RequireUppercase" } });
  model = update(model, { type: "RemoveCriterion", criterion: { type: "RequireSpecialChar" } });
  const [password, criteria, strength] = model;
  return {
    result: password === "P@ssw0rd!" && criteria.length === 3 && strength === "Moderate",
    values: [password, "P@ssw0rd!", criteria.length, 3, strength, "Moderate"],
  };
};

const tests = [test1, test2, test3, test4, test5, test6, test7, test8, test9, test10, test11, test12];
let score = 0;
for (let i = 0; i < tests.length; ++i) {
  try {
    const run = tests[i]();
    console.assert(run.result === true, "%o", { i: i + 1, values: run.values });
    if (run.result) {
      score++;
    }

  } catch (err) {
    console.log(err);
  }
}

console.log(`score: ${score} / ${tests.length}`);
