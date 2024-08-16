(* TODO MVU PRELUDE *)

(* A todo has a description and a status *)
(* type Todo = (String, Bool) in *)
type todo = string * bool

(* A description input buffer and a todo list *)
(* type Model = (String, [Todo]) in *)
type model = string * todo list

(* type Action = *)
(*   + AddTodo *)
(*   + RemoveTodo(Int) *)
(*   + ToggleTodo(Int) *)
(*   + UpdateBuffer(String) in *)
type action = AddTodo | RemoveTodo of int | ToggleTodo of int | UpdateBuffer of string

(* type Update = (Model, Action) -> Model in *)
type update = (model * action) -> model

(* let Todo.eq: (Todo, Todo) -> Bool = *)
(*   fun (d1, s1), (d2, s2) -> *)
(*   d1 $== d2 && bool_eq(s1, s2) in *)
let todo_eq (((d1, s1), (d2, s2)) : todo * todo) : bool =
  d1 = d2 && s1 = s2

(* let Model.eq: (Model, Model) -> Bool = *)
(*   fun (b1, ts1), (b2, ts2) -> *)
(*     b1 $== b2 && List.equal(Todo.eq, ts1, ts2) in *)
(* TODO: can't use todo_eq, as the comparator is a 'a -> 'a -> bool, not 'a * 'a -> bool *)
let model_eq (((b1, ts1), (b2, ts2)): model * model) : bool =
  b1 = b2 && (List.equal (fun (d1, s1) (d2, s2) -> d1 = d2 && s1 = s2) ts1 ts2)

(* let Model.init: Model = ("", []) in *)
let model_init : model = ("", [])

(* let add: Model -> [Todo] = *)
(*   fun (description, todos) -> *)
(*     if description $== ""       *)
(*     then todos      *)
(*     else (description, false) :: todos in *)
let add ((description, todos) : model) : todo list =
  if description = "" then todos else (description, false) :: todos

(* let remove: (Int, [Todo]) -> [Todo]= *)
(*   fun (index, todos) -> *)
(*     List.filteri(fun i, _ -> i!= index, todos) in *)
let remove ((index, todos) : int * todo list) : todo list =
  List.filteri (fun i _ -> i != index) todos

(* let toggle: (Int, [Todo]) -> [Todo]= *)
(*   fun (index, todos) -> *)
(*     List.mapi( *)
(*       fun i, (description, done) -> *)
(*         (description, if i == index then !done else done), *)
(*         todos) in *)
let toggle ((index, todos) : int * todo list) : todo list =
  List.mapi (fun i (description, finished) -> (description, if i = index then not finished else finished)) todos
