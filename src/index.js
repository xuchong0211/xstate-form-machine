import * as yup from "yup";
import _assign from "lodash/assign";
import _set from "lodash/set";
import _each from "lodash/each";
import _keysIn from "lodash/keysIn";
import _isFunction from "lodash/isFunction";

export default class FormMachineBuilder {
  constructor(id, xstate, shapes) {
    this.id = id;
    this.Machine = xstate.Machine;
    this.assign = xstate.assign;
    this.shapes = shapes;
    this.submitSchema = shapes ? yup.object().shape(shapes) : null;
  }

  checkValidity(object, validation) {
    _each(_keysIn(object), key => {
      const schema = this.getInputSchema(key);
      if (schema) {
        schema
          .validate(object)
          .then(() => {
            _set(validation, key, null);
          })
          .catch(error => {
            const { path, message } = error;
            _set(validation, path, message);
          });
      }
    });
    return validation;
  }

  getInputSchema(key) {
    if (this.shapes) {
      const shape = this.shapes[key];
      if (shape) {
        return yup.object().shape({ [key]: this.shapes[key] });
      }
    }
    return null;
  }

  getFormConfig() {
    return {
      id: this.id,
      initial: "idle",
      states: {
        idle: {
          on: {
            ONCHANGE: { actions: ["onChange", "verifyOnChange"] },
            CONFIRM: [
              {
                cond: { type: "confirmValidation" },
                target: "submit"
              },
              { actions: "verifyInputs" }
            ]
          }
        },
        submit: {
          invoke: {
            src: "onSubmit",
            onDone: {
              target: "success",
              actions: "onSuccess"
            },
            onError: {
              target: "idle",
              actions: "onFail"
            }
          }
        },
        success: {
          type: "final"
        }
      }
    };
  }
  services() {
    return { onSubmit: this.onSubmit };
  }
  guards() {
    return {
      confirmValidation: context => {
        const { inputFields } = context;
        if (this.submitSchema) {
          return this.submitSchema.isValidSync(inputFields);
        }
        return true;
      }
    };
  }
  actions() {
    return {
      onChange: this.assign({
        inputFields: (ctx, event) => {
          const { inputFields } = ctx;
          const { payload } = event;
          return _assign(inputFields, payload);
        }
      }),
      verifyOnChange: this.assign({
        inputErrors: (ctx, event) => {
          const { inputErrors = {} } = ctx;
          const { payload } = event;
          return this.checkValidity(payload, inputErrors);
        }
      }),
      verifyInputs: this.assign({
        inputErrors: ({ inputFields, inputErrors = {} }) => {
          return this.checkValidity(inputFields, inputErrors);
        }
      }),
      onSuccess: (...args) => {
        if (_isFunction(this.onSuccess)) {
          this.onSuccess(...args);
        }
      },
      onFail: (...args) => {
        if (_isFunction(this.onFail)) {
          this.onFail(...args);
        }
      }
    };
  }

  setOnSubmit(onSubmit) {
    this.onSubmit = onSubmit;
    return this;
  }

  setOnSuccess(onSuccess) {
    this.onSuccess = onSuccess;
    return this;
  }

  setOnFail(onFail) {
    this.onFail = onFail;
    return this;
  }

  build() {
    if (!this.onSubmit) {
      throw new Error(
        "onSubmit service is undefined in " + this.id + " Form Machine."
      );
    }
    return this.Machine(this.getFormConfig(), {
      services: this.services(),
      actions: this.actions(),
      guards: this.guards()
    });
  }
}
