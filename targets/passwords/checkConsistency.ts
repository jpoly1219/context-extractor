import {Model, Action} from "/home/jacob/projects/context-extractor/targets/passwords/prelude.ts"
function check(a: (password: Password, criteria: PasswordCriteria[]) => PasswordStrength): (model: Model, action: Action) => Model { return a; }
function check(a: (password: Password, criteria: PasswordCriteria[]) => PasswordStrength): Model { return a; }
function check(a: (password: Password, criteria: PasswordCriteria[]) => PasswordStrength): password { return a; }
function check(a: (password: Password, criteria: PasswordCriteria[]) => PasswordStrength): criteria { return a; }
function check(a: (password: Password, criteria: PasswordCriteria[]) => PasswordStrength): strength { return a; }
function check(a: (password: Password, criteria: PasswordCriteria[]) => PasswordStrength): Password { return a; }
function check(a: (password: Password, criteria: PasswordCriteria[]) => PasswordStrength): Criteria { return a; }
function check(a: (password: Password, criteria: PasswordCriteria[]) => PasswordStrength): Strength { return a; }