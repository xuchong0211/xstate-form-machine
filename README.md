# xstate-form-machine

xstate common form machine using yup validations

## Super quick start

```bash
npm install xstate
npm install xstate-form-machine
```

```js

//validation.js
import * as yup from "yup";

const phoneRegExp = /^[1][3-8][0-9]{9}$/;

export const nameShape = yup.string().required("请填写名称");

export const phoneShape = yup
  .string()
  .length(11, "请输入手机号必须为11位")
  .required("请输入手机号")
  .matches(phoneRegExp, "手机号码格式不正确");

export const addressShape = yup.string().required("请填写详细地址");


//machine.js

import { assign, Machine } from "xstate";
import FormMachineBuilder from "xstate-form-machine";

const onSubmit = async context => {
  const { id, inputFields } = context;
  const { name, phone, address } = inputFields;
  //todo
});

const onSuccess = (...args) => {
  //todo
};

const onFail = (...args) => {
  //todo
};

const shapes = {
  name: nameShape,
  phone: phoneShape,
  address: addressShape
};

export default new FormMachineBuilder(
  "address",
  { assign, Machine },
  shapes
)
  .setOnSubmit(onSubmit)
  .setOnSuccess(onSuccess)
  .setOnFail(onFail)
  .build();

///

////useMachine


  const [current, send] = useMachine(
    machine.withContext({
      id,
      inputFields: {
        name,
        phone,
        address
      }
    })
  );

  const { context } = current;
  const { inputFields, inputErrors = {} } = context;

    <View className="container">
      <InputBox
        inputFields={inputFields}
        inputErrors={inputErrors}
        onChange={({name, phone, address}) => {
           //send("ONCHANGE", {name, phone, address}) to update inputs
           send("ONCHANGE", {name, phone, address})
          }
        }
      />
      <View
        className="confirmButton"
        onClick={() => {
          //send("SUMBIT", to submit
          send("SUMBIT");
        }}
      >
        <Text className="confirmText">{"保存"}</Text>
      </View>
    </View>

```
