(* PASSWORD CHECKER MVU PRELUDE *)

(* type PasswordCriteria = *)
(*   + RequireUppercase *)
(*   + RequireLowercase *)
(*   + MinimumLength(Int) *)
(*   + RequireNumber *)
(*   + RequireSpecialChar in *)
type password_criteria =
  | RequireUppercase
  | RequireLowercase
  | MinimumLength of int
  | RequireNumber
  | RequireSpecialChar

(* type PasswordStrength = *)
(*   + Weak *)
(*   + Moderate *)
(*   + Strong in *)
type password_strength = Weak | Moderate | Strong

(* type Password = String in *)
type password = string

(* type Criteria = [PasswordCriteria] in *)
type criteria = password_criteria list

(* type Strength = PasswordStrength in *)
type strength = password_strength

(* type Model = (Password, Criteria, Strength) in *)
type model = password * criteria * strength

(* let initialModel: Model = ( *)
(*   "", *)
(*   [ *)
(*     MinimumLength(8), *)
(*     RequireUppercase, *)
(*     RequireLowercase, *)
(*     RequireNumber, *)
(*     RequireSpecialChar *)
(*   ], *)
(*   Weak *)
(* ) in *)
let initial_model : model =
  ( "",
    [
      MinimumLength 8;
      RequireUppercase;
      RequireLowercase;
      RequireNumber;
      RequireSpecialChar;
    ],
    Weak )

(* type Action = *)
(*   + UpdatePassword(String) *)
(*   + ClearCriteria *)
(*   + AddCriterion(PasswordCriteria) *)
(*   + RemoveCriterion(PasswordCriteria) in *)
type action =
  | UpdatePassword of string
  | ClearCriteria
  | AddCriterion of password_criteria
  | RemoveCriterion of password_criteria

(* let meetsMinLength: (String, Int) -> Bool = *)
(*   fun password, len -> *)
(*     string_length(password) >= len in *)
let meets_min_length ((password, len) : string * int) : bool =
  String.length password >= len

(* let hasFromSet: (String, String) -> Bool = *)
(*   fun password: Password, set: String -> *)
(*     let loop: String -> Bool = *)
(*       fun s: String -> *)
(*         if string_length(s) == 0  *)
(*         then false  *)
(*         else *)
(*           let first = string_sub(s, 0, 1) in *)
(*           if string_contains(set, first)  *)
(*           then true  *)
(*           else loop(string_sub(s, 1, string_length(s) - 1))  *)
(*   in loop(password) *)
(* in *)
let has_from_set ((password, set) : string * string) : bool =
  let rec loop (s : string) : bool =
    if String.length s = 0 then false
    else
      let first = String.get s 0 in
      if String.contains set first then true
      else loop (String.sub s 1 (String.length s - 1))
  in
  loop password

(* let hasUppercase: String -> Bool = *)
(*   fun password: Password -> *)
(*     hasFromSet(password, "ABCDEFGHIJKLMNOPQRSTUVWXYZ") in *)
let has_uppercase (password : string) : bool =
  has_from_set (password, "ABCDEFGHIJKLMNOPQRSTUVWXYZ")

(* let hasLowercase: Password -> Bool = *)
(*   fun password: Password -> *)
(*     hasFromSet(password, "abcdefghijklmnopqrstuvwxyz") in *)
let has_lowercase (password : password) : bool =
  has_from_set (password, "abcdefghijklmnopqrstuvwxyz")

(* let hasNumber: Password -> Bool = *)
(*   fun password: Password -> *)
(*     hasFromSet(password, "0123456789") in *)
let has_number (password : password) : bool =
  has_from_set (password, "0123456789")

(* let hasSpecialChar: Password -> Bool = *)
(*   fun password: Password -> *)
(*     hasFromSet(password, "!@#$%^&*()-_=+[]{}|;:,.<>?") in *)
let has_special_char (password : password) : bool =
  has_from_set (password, "!@#$%^&*()-_=+[]{}|;:,.<>?")

(* let meetsCriterion: (Password, PasswordCriteria) -> Bool = *)
(*   fun password, criterion -> *)
(*     case criterion *)
(*     | RequireUppercase => hasUppercase(password) *)
(*     | RequireLowercase => hasLowercase(password) *)
(*     | MinimumLength(len) => meetsMinLength(password, len) *)
(*     | RequireNumber => hasNumber(password) *)
(*     | RequireSpecialChar => hasSpecialChar(password)  *)
(*   end in *)
let meets_criterion ((password, criterion) : password * password_criteria) :
    bool =
  match criterion with
  | RequireUppercase -> has_uppercase password
  | RequireLowercase -> has_lowercase password
  | MinimumLength len -> meets_min_length (password, len)
  | RequireNumber -> has_number password
  | RequireSpecialChar -> has_special_char password

(* let metCriteria: (Password, [PasswordCriteria]) -> [Bool] = *)
(*   fun password, criteria -> *)
(*     List.filter( *)
(*       fun c: PasswordCriteria -> meetsCriterion(password, c), *)
(*       criteria *)
(*     ) in *)
let met_criteria ((password, criteria) : password * password_criteria list) :
    bool list =
  List.filter_map (fun c -> Some (meets_criterion (password, c))) criteria

(* let strength_of: Int -> PasswordStrength = *)
(*   fun num_criteria_met -> *)
(*     case num_criteria_met *)
(*     | 0 => Weak *)
(*     | 1 => Weak *)
(*     | 2 => Weak *)
(*     | 3 => Moderate *)
(*     | 4 => Strong *)
(*     | _ => Strong  *)
(*     end in *)
let strength_of (num_criteria_met : int) : password_strength =
  match num_criteria_met with
  | 0 -> Weak
  | 1 -> Weak
  | 2 -> Weak
  | 3 -> Moderate
  | 4 -> Strong
  | _ -> Strong

(* let calculateStrength: (Password, [PasswordCriteria]) -> PasswordStrength = *)
(*   fun password, criteria -> *)
(*     strength_of(List.length(metCriteria(password, criteria))) in *)
let calculate_strength
    ((password, criteria) : password * password_criteria list) :
    password_strength =
  strength_of (List.length (met_criteria (password, criteria)))
