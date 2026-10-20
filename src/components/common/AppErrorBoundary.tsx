import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { ErrorState } from '../feedback/ErrorState';
import { sanitizeDevLog } from '../../utils/apiError';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    sanitizeDevLog('AppErrorBoundary', error);
    if (__DEV__) {
      console.warn('[AppErrorBoundary] Component stack:', errorInfo?.componentStack?.slice(0, 300));
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ErrorState
            title={this.props.fallbackTitle || 'Something went wrong'}
            message={
              this.props.fallbackMessage ||
              'An unexpected issue occurred while rendering this screen. Please tap below to try again.'
            }
            onRetry={this.handleReset}
          />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
