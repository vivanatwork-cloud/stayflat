# User Report Deletion Spec

Signed-in users can delete their own saved wallet reports and saved combined portfolio from report results and wallet history. Every deletion needs a second confirmation. A wallet deletion also removes the saved portfolio when that wallet was included, preventing stale combined totals. Ownership is checked on the server and again in Convex. Successful deletion updates the page without a full reload; failures keep the report and show a clear error.
