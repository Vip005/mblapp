import React, { useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

const WebViewComponent: any = WebView;
import { Ionicons } from '@expo/vector-icons';
import {
  RazorpayCheckoutOptions,
  RazorpaySuccessResponse,
  RazorpayErrorResponse,
} from '../../services/payment/razorpayGateway';
import { useTheme } from '../../hooks/useTheme';

interface RazorpayCheckoutModalProps {
  visible: boolean;
  options: RazorpayCheckoutOptions | null;
  onSuccess: (response: RazorpaySuccessResponse) => void;
  onError: (error: RazorpayErrorResponse) => void;
  onClose: () => void;
}

export const RazorpayCheckoutModal: React.FC<RazorpayCheckoutModalProps> = ({
  visible,
  options,
  onSuccess,
  onError,
  onClose,
}) => {
  const { theme } = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);

  if (!visible || !options) {
    return null;
  }

  // Generate safe HTML payload with Razorpay Standard Checkout script
  const checkoutHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <title>FreshMart Payment</title>
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 0;
          background-color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          overflow: hidden;
        }
        .container {
          text-align: center;
          padding: 24px;
        }
        .spinner {
          border: 3px solid #e2e8f0;
          border-top: 3px solid #059669;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .title {
          font-size: 16px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 6px;
        }
        .subtitle {
          font-size: 13px;
          color: #64748b;
        }
      </style>
    </head>
    <body>
      <div class="container" id="loading-state">
        <div class="spinner"></div>
        <div class="title">Connecting to Razorpay...</div>
        <div class="subtitle">Secure 256-bit Encrypted Checkout</div>
      </div>

      <script>
        function sendEvent(type, payload) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, data: payload }));
          }
        }

        var rzpOptions = ${JSON.stringify(options)};

        rzpOptions.handler = function(response) {
          sendEvent('SUCCESS', {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id || rzpOptions.order_id,
            razorpay_signature: response.razorpay_signature
          });
        };

        rzpOptions.modal = {
          ondismiss: function() {
            sendEvent('CANCELLED', {
              code: 'USER_CANCELLED',
              description: 'Payment was cancelled by the user.'
            });
          },
          backdropclose: false,
          escape: false,
          handleback: true
        };

        try {
          var rzp = new Razorpay(rzpOptions);

          rzp.on('payment.failed', function(resp) {
            sendEvent('ERROR', {
              code: resp.error ? resp.error.code : 'PAYMENT_FAILED',
              description: resp.error ? resp.error.description : 'Payment transaction failed'
            });
          });

          // Open immediately
          rzp.open();
        } catch (err) {
          sendEvent('ERROR', {
            code: 'INIT_ERROR',
            description: err.message || 'Failed to initialize payment gateway.'
          });
        }
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'SUCCESS') {
        onSuccess(message.data);
      } else if (message.type === 'CANCELLED') {
        onError(message.data);
      } else if (message.type === 'ERROR') {
        onError(message.data);
      }
    } catch (e: any) {
      console.warn('[RazorpayCheckoutModal] Message parsing error:', e);
      onError({
        code: 'MESSAGE_PARSE_ERROR',
        description: 'Failed to parse payment gateway response.',
      });
    }
  };

  const handleCancelPress = () => {
    onError({
      code: 'USER_CANCELLED',
      description: 'Payment modal closed by user.',
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleCancelPress}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.card }]}>
        <StatusBar barStyle="dark-content" />
        
        {/* Modal Top Bar */}
        <View style={[styles.header, { borderBottomColor: theme.colors.borderLight }]}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary} />
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
              Secure Razorpay Checkout
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleCancelPress}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* WebView Container */}
        <View style={styles.webViewContainer}>
          <WebViewComponent
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: checkoutHtml, baseUrl: 'https://checkout.razorpay.com' }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onMessage={handleMessage}
            renderLoading={() => (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                  Loading Razorpay Gateway...
                </Text>
              </View>
            )}
            style={styles.webView}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
});
