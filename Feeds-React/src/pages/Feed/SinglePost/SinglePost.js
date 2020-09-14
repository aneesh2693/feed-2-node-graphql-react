import React, { Component } from 'react';

import Image from '../../../components/Image/Image';
import './SinglePost.css';

class SinglePost extends Component {
  state = {
    title: '',
    author: '',
    date: '',
    image: '',
    content: ''
  };

  componentDidMount() {
    const postId = this.props.match.params.postId;
    let graphqlQuery = {
        query: `
          query FetchSinglePost($postId: ID!) {
            post(id: $postId) {
                _id
                title
                content
                imageUrl
                creator { name }
                createdAt
              }
          }
        `,
        variables: {
          postId: postId
        }
      };

    fetch('http://localhost:8080/graphql', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.props.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(graphqlQuery)
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.errors){
            throw new Error(
              resData.errors[0].data?
                resData.errors[0].data[0].message
                : resData.errors[0].message
            );
        }
        const postData = resData.data.post;
        this.setState({
          title: postData.title,
          author: postData.creator.name,
          image: 'http://localhost:8080/'+postData.imageUrl,
          date: new Date(postData.createdAt).toLocaleDateString('en-US'),
          content: postData.content
        });
      })
      .catch(err => {
        console.log(err);
      });
  }

  render() {
    return (
      <section className="single-post">
        <h1>{this.state.title}</h1>
        <h2>
          Created by {this.state.author} on {this.state.date}
        </h2>
        <div className="single-post__image">
          <Image contain imageUrl={this.state.image} />
        </div>
        <p>{this.state.content}</p>
      </section>
    );
  }
}

export default SinglePost;
