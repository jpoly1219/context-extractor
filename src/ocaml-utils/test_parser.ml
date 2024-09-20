open Js_of_ocaml

(* Parse some stringified OCaml code. *)
(* let parse_from_string str = *)
(*   let lexbuf = Lexing.from_string str in *)
(*   try *)
(*     let parsed_str = Parse.implementation lexbuf in *)
(*     Some parsed_str *)
(*   with *)
(*   | Syntaxerr.Error _ -> *)
(*       prerr_endline "Syntax error!"; *)
(*       None *)
(*   | _ -> *)
(*       prerr_endline "An error occurred!"; *)
(*       None *)
(**)
(* let rec print_core_type (core_type : Parsetree.core_type) indent print_desc = *)
(*   let indent_str = String.make indent ' ' in *)
(*   match core_type.ptyp_desc with *)
(*   | Ptyp_tuple elements -> *)
(*       if print_desc then Printf.printf "%sTuple core types: " indent_str; *)
(*       Printf.printf "%s\n" (Format.asprintf "%a" Pprintast.core_type core_type); *)
(*       List.iter (fun el -> print_core_type el (indent + 2) false) elements; *)
(*       if print_desc then Printf.printf "\n" *)
(*   (* | Ptyp_constr (loc, []) -> *) *)
(*   (*     Printf.printf "%sIdentifier: %s\n" indent_str *) *)
(*   (*       (match loc.txt with Longident.Lident li -> li | _ -> "Other constr") *) *)
(*   | Ptyp_constr (loc, core_types) -> *)
(*       if print_desc then Printf.printf "%sConstr core types: " indent_str; *)
(*       List.iter *)
(*         (fun ctyp -> *)
(*           print_core_type ctyp indent false; *)
(*           Printf.printf " ") *)
(*         core_types; *)
(*       Printf.printf "%s" *)
(*         (match loc.txt with Longident.Lident li -> li | _ -> "Other constr"); *)
(*       if print_desc then Printf.printf "\n" *)
(*   | Ptyp_arrow (_, t1, t2) -> *)
(*       if print_desc then Printf.printf "%sArrow core type: " indent_str; *)
(*       print_core_type t1 (indent + 2) false; *)
(*       Printf.printf " -> "; *)
(*       print_core_type t2 (indent + 2) false; *)
(*       if print_desc then Printf.printf "\n" *)
(*   | _ -> Printf.printf "%sOther core_type\n" indent_str *)
(**)
(* let rec print_pattern (pattern : Parsetree.pattern) indent = *)
(*   let indent_str = String.make indent ' ' in *)
(*   match pattern.ppat_desc with *)
(*   | Parsetree.Ppat_var loc -> Printf.printf "%sVar: %s\n" indent_str loc.txt *)
(*   | Parsetree.Ppat_tuple pats -> *)
(*       Printf.printf "%sTuple:\n" indent_str; *)
(*       List.iter (fun pat -> print_pattern pat (indent + 2)) pats *)
(*   | Parsetree.Ppat_constraint (pat, core_type) -> *)
(*       Printf.printf "%sConstraint:\n" indent_str; *)
(*       print_pattern pat (indent + 2); *)
(*       print_core_type core_type (indent + 2) true *)
(*   | _ -> Printf.printf "%sOther pattern\n" indent_str *)
(**)
(* (* Print the expression tree. *) *)
(* let rec print_expression (expr : Parsetree.expression) indent = *)
(*   let indent_str = String.make indent ' ' in *)
(*   match expr.pexp_desc with *)
(*   | Pexp_ident { txt = Longident.Lident id; _ } -> *)
(*       Printf.printf "%sIdentifier: %s\n" indent_str id *)
(*   | Pexp_constant const -> *)
(*       Printf.printf "%sConstant: %s\n" indent_str *)
(*         (match const with *)
(*         | Pconst_integer (n, _) -> n *)
(*         | Pconst_string (s, _, _) -> "\"" ^ s ^ "\"" *)
(*         | Pconst_float (f, _) -> f *)
(*         | Pconst_char c -> String.make 1 c) *)
(*   | Pexp_apply (func, args) -> *)
(*       Printf.printf "%sApply:\n" indent_str; *)
(*       print_expression func (indent + 2); *)
(*       List.iter (fun (_, arg) -> print_expression arg (indent + 2)) args *)
(*   | Pexp_tuple elements -> *)
(*       Printf.printf "%sTuple:\n" indent_str; *)
(*       List.iter (fun el -> print_expression el (indent + 2)) elements *)
(*   | Pexp_function (params, rettype, _) -> ( *)
(*       Printf.printf "%sFunction:\n" indent_str; *)
(*       List.iter *)
(*         (fun (param : Parsetree.function_param) -> *)
(*           match param.pparam_desc with *)
(*           | Pparam_val (Nolabel, None, pat) -> *)
(*               Printf.printf "%s  Params:\n" indent_str; *)
(*               print_pattern pat (indent + 4) *)
(*           | Pparam_newtype loc -> *)
(*               Printf.printf "%sNewtype Param: %s\n" indent_str loc.txt *)
(*           | _ -> Printf.printf "%sOther params\n" indent_str) *)
(*         params; *)
(*       match rettype with *)
(*       | Some pcon -> ( *)
(*           match pcon with *)
(*           | Pconstraint ret -> *)
(*               Printf.printf "%s  Return:\n" indent_str; *)
(*               print_core_type ret (indent + 4) true *)
(*           | _ -> Printf.printf "%sOther rettype" indent_str) *)
(*       | _ -> Printf.printf "%sOther type_constraint\n" indent_str) *)
(*   | _ -> Printf.printf "%sOther expression\n" indent_str *)
(**)
(* (* Print the parsed structure. *) *)
(* let print_structure_item (item : Parsetree.structure_item) indent = *)
(*   let indent_str = String.make indent ' ' in *)
(*   match item.pstr_desc with *)
(*   | Pstr_value (rec_flag, bindings) -> *)
(*       Printf.printf "%sValue binding%s:\n" indent_str *)
(*         (if rec_flag = Recursive then " (recursive)" else ""); *)
(*       List.iter *)
(*         (fun (vb : Parsetree.value_binding) -> *)
(*           Printf.printf "%s  Pattern: %s\n" indent_str *)
(*             (Format.asprintf "%a" Pprintast.pattern vb.pvb_pat); *)
(*           Printf.printf "%s  Expression:\n" indent_str; *)
(*           print_expression vb.pvb_expr (indent + 4)) *)
(*         bindings *)
(*   | Pstr_type (_, type_decls) -> *)
(*       Printf.printf "%sType declarations:\n" indent_str; *)
(*       List.iter *)
(*         (fun (td : Parsetree.type_declaration) -> *)
(*           Printf.printf "%s  Type name: %s\n" indent_str td.ptype_name.txt; *)
(*           match td.ptype_kind with *)
(*           | Ptype_variant ctor_decls -> *)
(*               List.iter *)
(*                 (fun (ctor : Parsetree.constructor_declaration) -> *)
(*                   Printf.printf "%s  Constructor name: %s" indent_str *)
(*                     ctor.pcd_name.txt; *)
(*                   match ctor.pcd_args with *)
(*                   | Parsetree.Pcstr_tuple core_types -> *)
(*                       if List.length core_types = 0 then print_string "\n" *)
(*                       else *)
(*                         List.iter *)
(*                           (fun (core_type : Parsetree.core_type) -> *)
(*                             match core_type.ptyp_desc with *)
(*                             | Ptyp_constr ({ txt = Longident.Lident id; _ }, _) *)
(*                               -> *)
(*                                 Printf.printf "%s of %s\n" indent_str id *)
(*                             | _ -> *)
(*                                 Printf.printf "%sOther structure item\n" *)
(*                                   indent_str) *)
(*                           core_types *)
(*                   | _ -> Printf.printf "%sOther structure item\n" indent_str) *)
(*                 ctor_decls *)
(*           | _ -> Printf.printf "%sOther structure item\n" indent_str) *)
(*         type_decls *)
(*   | _ -> Printf.printf "%sOther structure item\n" indent_str *)
(**)
(* (* Print the structure. *) *)
(* let print_structure structure = *)
(*   List.iter (fun item -> print_structure_item item 0) structure *)

(* Function to print the parsed structure *)
(* let print_typedecl_tree (typedecl : Parsetree.type_declaration) (indent : int) = *)
(*   let indent_str = String.make indent ' ' in *)
(*   match typedecl.ptype_kind with *)
(*   | Ptype_variant ctor_decls -> *)
(*       print_int (List.length ctor_decls); *)
(*       print_string indent_str *)
(*   | _ -> Printf.printf "%sOther expression type\n" indent_str *)
(**)
(* let print_typedecl typedecl = print_typedecl_tree typedecl 0 *)

(* Function to print the parsed expression *)
(* let print_expression expr = print_expression_tree expr 0 *)

(* let read_file filename = *)
(*   let ch = open_in_bin filename in *)
(*   let s = really_input_string ch (in_channel_length ch) in *)
(*   close_in ch; *)
(*   s *)
let rec string_of_type (typ : Parsetree.core_type) : string =
  match typ.ptyp_desc with
  | Ptyp_arrow (_, t1, t2) ->
      let arg1 = string_of_type t1 in
      let arg2 = string_of_type t2 in
      arg1 ^ " -> " ^ arg2
  | Ptyp_tuple types ->
      let type_strings = List.map string_of_type types in
      String.concat " * " type_strings
  | Ptyp_constr ({ txt = Lident s; _ }, []) -> s
  | Ptyp_constr ({ txt = Lident s; _ }, ctyp_list) ->
      let args_str = List.map string_of_type ctyp_list |> String.concat ", " in
      args_str ^ " " ^ s
  | _ -> "unknown"

let rec extract_core_type (ctyp : Parsetree.core_type) (components_only : bool)
    =
  if components_only then (
    match ctyp.ptyp_desc with
    | Ptyp_arrow (_, argtyp, rettyp) ->
        [ "Ptyp_arrow"; string_of_type argtyp; string_of_type rettyp ]
    | Ptyp_tuple types ->
        "Ptyp_tuple"
        :: List.fold_right (fun curr acc -> string_of_type curr :: acc) types []
    | Ptyp_constr ({ txt = Lident id; _ }, []) -> [ "Ptyp_constr"; id ]
    | Ptyp_constr ({ txt = Lident id; _ }, [ ctyps ]) ->
        [ "Ptyp_constr"; string_of_type ctyps; id ]
    | _ ->
        Printf.printf "Other core type";
        [ "Other core type" ])
  else
    match ctyp.ptyp_desc with
    | Ptyp_arrow (_, _, rettyp) ->
        string_of_type ctyp :: extract_core_type rettyp components_only
    | Ptyp_tuple types ->
        List.fold_left
          (fun acc curr ->
            List.append (extract_core_type curr components_only) acc)
          [] types
    | Ptyp_constr ({ txt = Lident id; _ }, []) -> id :: []
    | Ptyp_constr ({ txt = Lident id; _ }, [ ctyps ]) ->
        [ string_of_type ctyps ^ " " ^ id ]
    | _ ->
        Printf.printf "Other core type";
        []

(* Save this for later when we actually need to get the constructors *)
(* let analyze_structure (structure : Parsetree.structure) = *)
(* List.iter *)
(*   (fun (item : Parsetree.structure_item) -> *)
(*     match item.pstr_desc with *)
(*     | Pstr_type (_, type_decls) -> *)
(*         List.iter *)
(*           (fun (td : Parsetree.type_declaration) -> *)
(*             (* Printf.printf "Type: %s\n" td.ptype_name.txt; *) *)
(*             match td.ptype_kind with *)
(*             | Ptype_variant ctors -> *)
(*                 List.iter *)
(*                   (fun (ctor : Parsetree.constructor_declaration) -> *)
(*                     Printf.printf "  Constructor: %s\n" ctor.pcd_name.txt) *)
(*                   ctors *)
(*             | _ -> Printf.printf "Other type kind\n") *)
(*           type_decls *)
(*     | _ -> Printf.printf "Not a type declaration\n") *)
(*   structure; *)

let parse_core_type_from_type_span s =
  let lexbuf = Lexing.from_string s in
  try Some (Parse.core_type lexbuf) with _ -> None

let parse_implementation_from_type_span s =
  let lexbuf = Lexing.from_string ("type tmp = " ^ s) in
  try Some (Parse.implementation lexbuf) with _ -> None

(* Walk the AST and extrac]]t target types. *)
let extract_target_types (type_span : string) =
  let parsed = parse_core_type_from_type_span type_span in
  match parsed with
  | Some ctyp -> extract_core_type ctyp false
  | None -> (
      let parsed2 = parse_implementation_from_type_span type_span in
      match parsed2 with
      (* | Some impl -> analyze_structure impl *)
      | Some _ -> [ type_span ]
      | None -> failwith "Failed to parse type span")

(* print_endline "Structure parsed successfully!"; *)
(* extract_core_type parsed false *)

let extract_component_types (type_span : string) =
  let parsed = parse_core_type_from_type_span type_span in
  match parsed with
  | Some ctyp -> extract_core_type ctyp true
  | None -> (
      let parsed2 = parse_implementation_from_type_span type_span in
      match parsed2 with
      (* | Some impl -> analyze_structure impl *)
      | Some _ -> [ type_span ]
      | None -> failwith "Failed to parse type span")

let js_extract_target_types (type_span : string) =
  let extracted = extract_target_types type_span in
  Js.array (Array.of_list extracted)

(* What do we want? todo -> model * int would yield todo, model * int *)
(* model * int * string would yield model, int, string *)
let js_extract_component_types (type_span : string) =
  let extracted = extract_component_types type_span in
  Js.array (Array.of_list extracted)

(* Example usage *)
(* let () = *)
(*   (* TODO: How do we extract this type span string? *) *)
(*   let strs = *)
(*     [ *)
(*       "todo * todo -> bool"; *)
(*       "model * model -> bool"; *)
(*       "model"; *)
(*       "model -> todo list"; *)
(*       "int * todo list -> todo list"; *)
(*       "int * todo list -> todo list * bool"; *)
(*       "int * todo list -> ((todo * action) * (string -> bool))"; *)
(*       "id list * playlist_state"; *)
(*       "Playing of id | PausedOn of id | NoSongSelected"; *)
(*     ] *)
(*   in *)
(*   (* let str = *) *)
(*   (*   read_file *) *)
(*   (*     "/home/jacob/projects/context-extractor/targets/ocaml/todo/prelude.ml" *) *)
(*   (* in *) *)
(*   List.iter *)
(*     (fun str -> *)
(*       List.iter *)
(*         (fun el -> *)
(*           print_string el; *)
(*           print_endline " ; ") *)
(*         (extract_target_types str)) *)
(*     strs *)

let _ = Js.export "parse" (Js.wrap_callback js_extract_target_types)
let _ = Js.export "getComponents" (Js.wrap_callback js_extract_component_types)

(* match parse_from_string str with *)
(* | Some parsed_str -> *)
(*     print_endline "Structure parsed successfully!"; *)
(*     print_structure parsed_str *)
(* | None -> print_endline "Failed to parse structure." *)
