import { startTransition, type FormEvent } from "react";

/**
 * React 19 resets uncontrolled fields after a `<form action>` submission, which wipes
 * long edit forms when validation fails. Submitting through onSubmit keeps the user's input.
 */
export function submitWithoutReset(action: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  };
}
