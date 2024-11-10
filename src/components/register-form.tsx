import { Fragment, useState } from "react";
import type { FormEvent } from "react";

export default function RegisterForm() {
  const [errorMessage, setErrorMessage] = useState(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();

    if (!response.ok) {
      setErrorMessage(data.message);
      return;
    }

    console.log(data);

    if (response.status === 201) {
      return window.location.replace(`/verify/${data.data.id}`);
    }
  }

  return (
    <Fragment>
      <form
        onSubmit={submit}
        className="flex flex-col gap-2 p-2 border border-zinc-500 rounded-md items-start"
      >
        <label htmlFor="name" className="inline-flex items-center gap-2">
          Name
          <input
            type="text"
            name="name"
            required
            defaultValue="name"
            className="border border-gray-600 p-1"
          />
        </label>
        <label htmlFor="email" className="inline-flex items-center gap-2">
          Email
          <input
            type="email"
            name="email"
            required
            defaultValue="test@test.com"
            className="border border-gray-600 p-1"
          />
        </label>
        <label htmlFor="password" className="inline-flex items-center gap-2">
          Password
          <input
            type="password"
            name="password"
            required
            defaultValue="password"
            className="border border-gray-600 p-1"
          />
        </label>
        <button
          type="submit"
          className="inline-flex border border-green-600 p-2 rounded-md"
        >
          Submit
        </button>
      </form>
      {errorMessage && <p className="text-red-500">{errorMessage}</p>}
    </Fragment>
  );
}
