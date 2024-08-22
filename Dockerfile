FROM node:22-bullseye
SHELL ["/bin/bash", "-c"]

RUN apt update -y && apt upgrade -y && apt install -y curl opam python3 python3-pip

# RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
# RUN source ~/.bashrc
# RUN nvm install 22

WORKDIR /app

RUN opam init -y --disable-sandboxing
# RUN eval "$(opam env)"
RUN opam update -y
# RUN eval "$(opam env)"
RUN opam upgrade -y
RUN opam switch create . ocaml-base-compiler -y
# RUN eval "$(opam env)"
# RUN opam install -y ocaml-lsp-server odoc ocamlformat utop dune ounit2
RUN opam install -y dune ounit2
# RUN eval "$(opam env)"
# RUN echo "eval $(opam env)" >> ~/.bashrc
# RUN source ~/.bashrc
# ENV OPAM_ENV="${opam env}"
# COPY ./opam-env-setter.sh /app
# RUN chmod +x opam-env-setter.sh
# RUN ./opam-env-setter.sh

ENV OPAM_SWITCH_PREFIX="/app/_opam"
ENV CAML_LD_LIBRARY_PATH="/app/_opam/lib/stublibs:/app/_opam/lib/ocaml/stublibs:/app/_opam/lib/ocaml"
ENV OCAML_TOPLEVEL_PATH="/app/_opam/lib/toplevel"
ENV MANPATH=":/app/_opam/man"
ENV PATH="/app/_opam/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

RUN npm install -g typescript typescript-language-server tslib

COPY package.json /app
RUN npm install -y

RUN pip install openai numpy scikit-learn

COPY . /app

WORKDIR /app/targets/ocaml/todo
RUN dune build; exit 0
WORKDIR /app/targets/ocaml/playlist
RUN dune build; exit 0
WORKDIR /app/targets/ocaml/passwords
RUN dune build; exit 0
WORKDIR /app/targets/ocaml/booking
RUN dune build; exit 0
WORKDIR /app/targets/ocaml/emojipaint
RUN dune build; exit 0

WORKDIR /app

RUN npm run build
CMD ["node", "dist/runner.js"]
