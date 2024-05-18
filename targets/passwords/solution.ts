import { Model, Action, calculateStrength, PasswordCriteria } from "./prelude";

// PASSWORDS MVU SOLUTION

const update = (model: Model, action: Action): Model => {
  switch (action.type) {
    case "ClearCriteria":
      const [password, , strength] = model;
      return [password, [], strength];
    case "UpdatePassword":
      const [, criteria,] = model;
      const newStrength = calculateStrength(action.password, criteria);
      return [action.password, criteria, newStrength];
    case "AddCriterion":
      const [currentPassword, currentCriteria,] = model;
      const newCriteria = [action.criterion, ...currentCriteria];
      const updatedStrength = calculateStrength(currentPassword, newCriteria);
      return [currentPassword, newCriteria, updatedStrength];
    case "RemoveCriterion":
      const [pwd, crit,] = model;
      const filteredCriteria = crit.filter((c: PasswordCriteria) => c.type !== action.criterion.type);
      const recalculatedStrength = calculateStrength(pwd, filteredCriteria);
      return [pwd, filteredCriteria, recalculatedStrength];
  }
};

export { update };
