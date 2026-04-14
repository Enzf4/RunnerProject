# Documentação para o Desenvolvedor Frontend: Endpoint de Exclusão de Post

A API agora suporta a exclusão de postagens. Abaixo, você encontrará os detalhes do novo endpoint e um roteiro de como utilizá-lo no Frontend com **React**.

## Detalhes do Endpoint

**Endpoint:** `DELETE /api/Post/{postId}`  
**Descrição:** Permite que um usuário exclua seu próprio post. O sistema irá checar se o usuário solicitante é efetivamente o dono.  
**Corpo da Requisição (JSON):**
Para seguir o padrão atual do controlador, o `userId` deve ser enviado via body da requisição:
```json
{
  "userId": "uuid-do-usuario"
}
```

### Possíveis Respostas do Servidor

- **200 OK:** Post deletado com sucesso.
- **403 Forbidden:** O `userId` enviado não é correspondente ao autor do post (não autorizado).
- **404 Not Found:** O post que está tentando ser excluído não foi localizado no backend.

---

## Exemplo de Uso com React

Aqui está um modelo de como construir a função dentro do seu componente React.

###  1. Usando a API Fetch:

```javascript
import React, { useState } from 'react';

const DeletePostButton = ({ postId, currentUserId, onPostDeleted }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmDelete = window.confirm("Tem certeza que deseja excluir esta postagem?");
    if (!confirmDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`https://sua-api.com/api/Post/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${token}` // Se o token for reinstaurado
        },
        body: JSON.stringify({ userId: currentUserId })
      });

      if (response.ok) {
        alert("Post excluído com sucesso!");
        // Opcional: atualizar o estado local / lista de posts
        if (onPostDeleted) onPostDeleted(postId);
      } else if (response.status === 403) {
        alert("Você não tem permissão para excluir este post.");
      } else if (response.status === 404) {
        alert("Postagem não encontrada.");
      } else {
        alert("Ocorreu um erro ao tentar excluir o post.");
      }
    } catch (error) {
      console.error("Erro na requisição:", error);
      alert("Erro de conexão.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button onClick={handleDelete} disabled={isDeleting} style={{ color: 'red' }}>
      {isDeleting ? "Excluindo..." : "🗑️ Excluir Post"}
    </button>
  );
};

export default DeletePostButton;
```

### 2. Dica Importante: Usando Axios

Se você utiliza **Axios**, lembre-se que para requisições `DELETE`, o "body" (corpo) tem que ser passado na propriedade `data` no segundo argumento.

```javascript
import axios from 'axios';

const handleDeleteAxios = async () => {
    try {
        await axios.delete(`https://sua-api.com/api/Post/${postId}`, {
            data: { userId: currentUserId } // <-- BODY DEVE IR NO OBJETO 'data'
        });
        console.log("Sucesso ao deletar");
        
    } catch (error) {
        if (error.response?.status === 403) {
            console.error("Não autorizado a deletar o post.");
        } else if (error.response?.status === 404) {
             console.error("Post não encontrado");
        }
    }
}
```
