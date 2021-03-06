import refractor from "refractor/core";
import yaml from "refractor/lang/yaml";

import { setBlockType } from "prosemirror-commands";
import { textblockTypeInputRule } from "prosemirror-inputrules";
import copy from "copy-to-clipboard";
import Prism, { LANGUAGES } from "../plugins/Prism";
import Node from "./Node";
import { ToastType } from "../types";

refractor.register(yaml);

export default class CodeFence extends Node {
  get languageOptions() {
    return Object.entries(LANGUAGES);
  }

  get name() {
    return "code_fence";
  }

  get schema() {
    return {
      attrs: {
        language: {
          default: "yaml",
        },
      },
      content: "text*",
      marks: "",
      group: "block",
      code: true,
      defining: true,
      draggable: false,
      parseDOM: [
        { tag: "pre", preserveWhitespace: "full" },
        {
          tag: ".code-block",
          preserveWhitespace: "full",
          contentElement: "code",
          getAttrs: (dom: HTMLDivElement) => {
            return {
              language: dom.dataset.language,
            };
          },
        },
      ],
      toDOM: node => {
        const button = document.createElement("button");
        button.innerText = "Copy";
        button.type = "button";
        button.addEventListener("click", this.handleCopyToClipboard(node));

        const select = document.createElement("select");
        select.addEventListener("change", this.handleLanguageChange);

        this.languageOptions.forEach(([key, label]) => {
          const option = document.createElement("option");
          const value = key === "none" ? "" : key;
          option.value = value;
          option.innerText = label;
          option.selected = node.attrs.language === value;
          select.appendChild(option);
        });

        return [
          "div",
          { class: "code-block", "data-language": node.attrs.language },
          ["div", { contentEditable: false }, select, button],
          ["pre", ["code", { spellCheck: false }, 0]],
        ];
      },
    };
  }

  commands({ type }) {
    return () => setBlockType(type);
  }

  keys({ type }) {
    return {
      "Shift-Ctrl-\\": setBlockType(type),
    };
  }

  handleCopyToClipboard(node) {
    return () => {
      copy(node.textContent);
      if (this.options.onShowToast) {
        this.options.onShowToast(
          this.options.dictionary.codeCopied,
          ToastType.Info
        );
      }
    };
  }

  handleLanguageChange = (event) => {
    const { view } = this.editor;
    const { tr } = view.state;
    const element = event.target;
    const { top, left } = element.getBoundingClientRect();
    const result = view.posAtCoords({ top, left });

    if (result) {
      const transaction = tr.setNodeMarkup(result.inside, undefined, {
        language: element.value,
      });
      view.dispatch(transaction);
    }
  };

  get plugins() {
    return [
      Prism({
        name: this.name,
        deferred: !this.options.initialReadOnly,
      }),
    ];
  }

  inputRules({ type }) {
    return [textblockTypeInputRule(/^```$/, type)];
  }

  toMarkdown(state, node) {
    state.write("```" + (node.attrs.language || "") + "\n");
    state.text(node.textContent, false);
    state.ensureNewLine();
    state.write("```");
    state.closeBlock(node);
  }

  get markdownToken() {
    return "fence";
  }

  parseMarkdown() {
    return {
      block: "code_block",
      getAttrs: (tok) => ({ language: tok.info }),
    };
  }
}
