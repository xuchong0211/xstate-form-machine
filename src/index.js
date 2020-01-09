import * as yup from "yup";
import _assign from "lodash/assign";
import _set from "lodash/set";
import _keysIn from "lodash/keysIn";
import _isFunction from "lodash/isFunction";

const ONCHANGE_ACTION = "ONCHANGE";
const SUBMIT_ACTION = "SUBMIT";

export default class FormMachineBuilder {
  constructor(id, xstate, shapes) {
    this.id = id;
    this.Machine = xstate.Machine;
    this.assign = xstate.assign;
    this.shapes = shapes;
    this.submitSchema = shapes ? yup.object().shape(shapes) : null;
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

  async checkValidity({ shape, validation = {} }) {
    const keys = _keysIn(shape);
    for (let i in keys) {
      const key = keys[i];
      const schema = this.getInputSchema(key);
      if (schema) {
        try {
          await schema.validate(shape);
          _set(validation, key, null);
        } catch (error) {
          const { path, message } = error;
          _set(validation, path, message);
        }
      }
    }
    return { shape, validation };
  }

  getFormConfig() {
    return {
      id: this.id,
      initial: "idle",
      states: {
        idle: {
          on: {
            [ONCHANGE_ACTION]: "verify",
            [SUBMIT_ACTION]: [
              {
                cond: { type: "confirmValidation" },
                target: "submit"
              },
              { target: "verify" }
            ]
          }
        },
        verify: {
          invoke: {
            src: "verify",
            onDone: {
              target: "idle",
              actions: "onChange"
            }
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
    return {
      onSubmit: this.onSubmit,
      verify: async (context, event) => {
        const { inputErrors: validation, inputFields } = context;
        const { type, payload } = event;
        const shape =
            type === ONCHANGE_ACTION
                ? payload
                : type === SUBMIT_ACTION
                ? inputFields
                : {};
        const result = await this.checkValidity({
          shape,
          validation
        });
        return result;
      }
    };
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
      onChange: this.assign((context, event) => {
        const { shape, validation } = event.data;
        const {
          inputFields: preInputFields,
          inputErrors: preInputErrors
        } = context;
        const inputFields = _assign(preInputFields || {}, shape);
        const inputErrors = _assign(preInputErrors || {}, validation);
        return _assign(context, { inputFields, inputErrors });
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
