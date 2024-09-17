(* TODO MVU PRELUDE *)

(* A todo has a description and a status *)
type todo = string * bool

(* A description input buffer and a todo list *)
type model = string * todo list

type action =
  | AddTodo
  | RemoveTodo of int
  | ToggleTodo of int
  | UpdateBuffer of string

type update = model * action -> model

let todo_eq (((d1, s1), (d2, s2)) : todo * todo) : bool = d1 = d2 && s1 = s2

(* TODO: can't use todo_eq, as the comparator is a 'a -> 'a -> bool, not 'a * 'a -> bool *)
let model_eq (((b1, ts1), (b2, ts2)) : model * model) : bool =
  b1 = b2 && List.equal (fun (d1, s1) (d2, s2) -> d1 = d2 && s1 = s2) ts1 ts2

let model_init : model = ("", [])

let add ((description, todos) : model) : todo list =
  if description = "" then todos else (description, false) :: todos

let remove ((index, todos) : int * todo list) : todo list =
  List.filteri (fun i _ -> i != index) todos

let toggle ((index, todos) : int * todo list) : todo list =
  List.mapi
    (fun i (description, finished) ->
      (description, if i = index then not finished else finished))
    todos
