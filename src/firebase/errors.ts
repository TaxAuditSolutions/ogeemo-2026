/**
 * Represents the context of a Firestore security rule denial.
 */
export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

/**
 * A custom error class for Firestore permission errors.
 * This class captures detailed context about the failed operation,
 * which is then used by the FirebaseErrorListener to provide rich

 */
export class FirestorePermissionError extends Error {
  public context: SecurityRuleContext;
  public readonly isFirestorePermissionError = true;

  constructor(context: SecurityRuleContext) {
    const operation = context.operation.toUpperCase();
    const message = `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:\n${JSON.stringify({
        operation,
        path: context.path,
        requestData: context.requestResourceData,
    }, null, 2)}`;
    
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;
    
    // This is necessary for custom errors to work correctly in modern JavaScript/TypeScript.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Type guard to check if an error is an instance of FirestorePermissionError.
 */
export function isFirestorePermissionError(error: any): error is FirestorePermissionError {
  return error && error.isFirestorePermissionError === true;
}
