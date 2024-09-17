(* PASSWORD CHECKER MVU PRELUDE *)

type password_criteria =
  | RequireUppercase
  | RequireLowercase
  | MinimumLength of int
  | RequireNumber
  | RequireSpecialChar

type password_strength = Weak | Moderate | Strong

type password = string

type criteria = password_criteria list

type strength = password_strength

type model = password * criteria * strength

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

type action =
  | UpdatePassword of string
  | ClearCriteria
  | AddCriterion of password_criteria
  | RemoveCriterion of password_criteria

let meets_min_length ((password, len) : string * int) : bool =
  String.length password >= len

let has_from_set ((password, set) : string * string) : bool =
  let rec loop (s : string) : bool =
    if String.length s = 0 then false
    else
      let first = String.get s 0 in
      if String.contains set first then true
      else loop (String.sub s 1 (String.length s - 1))
  in
  loop password

let has_uppercase (password : string) : bool =
  has_from_set (password, "ABCDEFGHIJKLMNOPQRSTUVWXYZ")

let has_lowercase (password : password) : bool =
  has_from_set (password, "abcdefghijklmnopqrstuvwxyz")

let has_number (password : password) : bool =
  has_from_set (password, "0123456789")

let has_special_char (password : password) : bool =
  has_from_set (password, "!@#$%^&*()-_=+[]{}|;:,.<>?")

let meets_criterion ((password, criterion) : password * password_criteria) :
    bool =
  match criterion with
  | RequireUppercase -> has_uppercase password
  | RequireLowercase -> has_lowercase password
  | MinimumLength len -> meets_min_length (password, len)
  | RequireNumber -> has_number password
  | RequireSpecialChar -> has_special_char password

let met_criteria ((password, criteria) : password * password_criteria list) :
    bool list =
  List.filter_map (fun c -> Some (meets_criterion (password, c))) criteria

let strength_of (num_criteria_met : int) : password_strength =
  match num_criteria_met with
  | 0 -> Weak
  | 1 -> Weak
  | 2 -> Weak
  | 3 -> Moderate
  | 4 -> Strong
  | _ -> Strong

let calculate_strength
    ((password, criteria) : password * password_criteria list) :
    password_strength =
  strength_of (List.length (met_criteria (password, criteria)))
