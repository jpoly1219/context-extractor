(* Parse some stringified OCaml code. *)
let parse_from_string str =
  let lexbuf = Lexing.from_string str in
  try
    let parsed_str = Parse.implementation lexbuf in
    Some parsed_str
  with
  | Syntaxerr.Error _ ->
      prerr_endline "Syntax error!";
      None
  | _ ->
      prerr_endline "An error occurred!";
      None

(* Print the expression tree. *)
let rec print_expression (expr : Parsetree.expression) indent =
  let indent_str = String.make indent ' ' in
  match expr.pexp_desc with
  | Pexp_ident { txt = Longident.Lident id; _ } ->
      Printf.printf "%sIdentifier: %s\n" indent_str id
  | Pexp_constant const ->
      Printf.printf "%sConstant: %s\n" indent_str
        (match const with
        | Pconst_integer (n, _) -> n
        | Pconst_string (s, _, _) -> "\"" ^ s ^ "\""
        | Pconst_float (f, _) -> f
        | Pconst_char c -> String.make 1 c)
  | Pexp_apply (func, args) ->
      Printf.printf "%sApply:\n" indent_str;
      print_expression func (indent + 2);
      List.iter (fun (_, arg) -> print_expression arg (indent + 2)) args
  | _ -> Printf.printf "%sOther expression\n" indent_str

(* Print the parsed structure. *)
let print_structure_item (item : Parsetree.structure_item) indent =
  let indent_str = String.make indent ' ' in
  match item.pstr_desc with
  | Pstr_value (rec_flag, bindings) ->
      Printf.printf "%sValue binding%s:\n" indent_str
        (if rec_flag = Recursive then " (recursive)" else "");
      List.iter
        (fun (vb : Parsetree.value_binding) ->
          Printf.printf "%s  Pattern: %s\n" indent_str
            (Format.asprintf "%a" Pprintast.pattern vb.pvb_pat);
          Printf.printf "%s  Expression:\n" indent_str;
          print_expression vb.pvb_expr (indent + 2))
        bindings
  | Pstr_type (_, type_decls) ->
      Printf.printf "%sType declarations:\n" indent_str;
      List.iter
        (fun (td : Parsetree.type_declaration) ->
          Printf.printf "%s  Type name: %s\n" indent_str td.ptype_name.txt;
          match td.ptype_kind with
          | Ptype_variant ctor_decls ->
              List.iter
                (fun (ctor : Parsetree.constructor_declaration) ->
                  Printf.printf "%s  Constructor name: %s" indent_str
                    ctor.pcd_name.txt;
                  match ctor.pcd_args with
                  | Parsetree.Pcstr_tuple core_types ->
                      if List.length core_types = 0 then print_string "\n"
                      else
                        List.iter
                          (fun (core_type : Parsetree.core_type) ->
                            match core_type.ptyp_desc with
                            | Ptyp_constr ({ txt = Longident.Lident id; _ }, _)
                              ->
                                Printf.printf "%s of %s\n" indent_str id
                            | _ ->
                                Printf.printf "%sOther structure item\n"
                                  indent_str)
                          core_types
                  | _ -> Printf.printf "%sOther structure item\n" indent_str)
                ctor_decls
          | _ -> Printf.printf "%sOther structure item\n" indent_str)
        type_decls
  | _ -> Printf.printf "%sOther structure item\n" indent_str

let print_structure structure =
  List.iter (fun item -> print_structure_item item 0) structure

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

(* Example usage *)
let () =
  let str =
    "\n\
     type action =\n\
    \  | AddTodo\n\
    \  | RemoveTodo of int\n\
    \  | ToggleTodo of int\n\
    \  | UpdateBuffer of string\n"
  in
  match parse_from_string str with
  | Some parsed_str ->
      print_endline "Structure parsed successfully!";
      print_structure parsed_str
  | None -> print_endline "Failed to parse structure."
