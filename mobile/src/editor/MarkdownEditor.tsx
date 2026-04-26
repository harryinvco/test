import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { HostMessage, WebMessage, type EditorTheme, type ToolbarAction } from "./bridge";

export type MarkdownEditorHandle = {
  insertMarkdown: (action: ToolbarAction) => void;
};

type Props = {
  content: string;
  readOnly: boolean;
  theme: EditorTheme;
  onChange: (content: string) => void;
  onError?: (msg: string) => void;
};

const editorHtml = require("../../assets/editor/index.html");

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, Props>(function MarkdownEditor(
  { content, readOnly, theme, onChange, onError },
  ref,
) {
  const webviewRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const lastSentContentRef = useRef<string | null>(null);

  const send = useCallback((msg: HostMessage) => {
    const js = `(function(){
      var payload = ${JSON.stringify(JSON.stringify(msg))};
      window.dispatchEvent(new MessageEvent('message', { data: payload }));
      document.dispatchEvent(new MessageEvent('message', { data: payload }));
    })(); true;`;
    webviewRef.current?.injectJavaScript(js);
  }, []);

  useImperativeHandle(ref, () => ({
    insertMarkdown: (action) => send({ kind: "insertMarkdown", action }),
  }), [send]);

  useEffect(() => {
    if (!ready) return;
    send({ kind: "init", content, readOnly, theme });
    lastSentContentRef.current = content;
  }, [ready, send]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready) return;
    if (lastSentContentRef.current === content) return;
    send({ kind: "setContent", content });
    lastSentContentRef.current = content;
  }, [content, ready, send]);

  useEffect(() => {
    if (!ready) return;
    send({ kind: "setReadOnly", readOnly });
  }, [readOnly, ready, send]);

  const onMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = WebMessage.parse(JSON.parse(event.nativeEvent.data));
      if (msg.kind === "ready") setReady(true);
      else if (msg.kind === "change") {
        lastSentContentRef.current = msg.content;
        onChange(msg.content);
      } else if (msg.kind === "log") {
        // eslint-disable-next-line no-console
        console.log(`[editor:${msg.level}]`, msg.msg);
      }
    } catch {
      // swallow malformed
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={editorHtml}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        keyboardDisplayRequiresUserAction={false}
        hideKeyboardAccessoryView
        onMessage={onMessage}
        onError={(e) => onError?.(String(e.nativeEvent.description))}
        onHttpError={(e) => onError?.(`http ${e.nativeEvent.statusCode}`)}
        scrollEnabled={false}
        style={styles.webview}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: "transparent" },
});
