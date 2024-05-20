const initialModel = [
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
const meetsMinLength = (password, len) => {
    return password.length >= len;
};
const hasFromSet = (password, set) => {
    const loop = (s) => {
        if (s.length === 0) {
            return false;
        }
        else {
            const first = s[0];
            if (set.includes(first)) {
                return true;
            }
            else {
                return loop(s.slice(1));
            }
        }
    };
    return loop(password);
};
const hasUppercase = (password) => {
    return hasFromSet(password, "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
};
const hasLowercase = (password) => {
    return hasFromSet(password, "abcdefghijklmnopqrstuvwxyz");
};
const hasNumber = (password) => {
    return hasFromSet(password, "0123456789");
};
const hasSpecialChar = (password) => {
    return hasFromSet(password, "!@#$%^&*()-_=+[]{}|;:,.<>?");
};
const meetsCriterion = (password, criterion) => {
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
const metCriteria = (password, criteria) => {
    return criteria.filter((c) => meetsCriterion(password, c));
};
const strength_of = (num_criteria_met) => {
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
const calculateStrength = (password, criteria) => {
    return strength_of(metCriteria(password, criteria).length);
};
export { initialModel, meetsMinLength, hasFromSet, hasUppercase, hasLowercase, hasNumber, hasSpecialChar, meetsCriterion, metCriteria, strength_of, calculateStrength };
